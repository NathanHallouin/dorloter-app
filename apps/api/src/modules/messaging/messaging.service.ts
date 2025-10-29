/**
 * Messagerie utilisateur (adoptant) <-> refuge, en polling. Côté refuge,
 * l'autorisation passe par les permissions de membre (`MessagesRead`), jamais par
 * le rôle JWT : un bénévole peut répondre.
 */

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { AppError } from '../../shared/app-error';
import { ShelterDirectory } from '../shelters/shelter-directory.service';
import { ShelterMembershipService } from '../shelters/shelter-membership.service';

export const SENDER_USER = 'user';
export const SENDER_SHELTER = 'shelter';

const PREVIEW_MAX = 200;

/** Fil de discussion entre un utilisateur (adoptant) et un refuge. */
export interface ConversationRecord {
  id: string;
  user_id: string;
  shelter_id: string;
  pet_id: string | null;
  subject: string | null;
  last_message_at: Date;
  last_message_preview: string | null;
  last_sender_type: string | null;
  user_unread_count: number;
  shelter_unread_count: number;
  created_at: Date;
}

/** Message d'une conversation. `sender_type` = user | shelter. */
export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_type: string;
  content: string | null;
  attachment_type: string | null;
  attachment_url: string | null;
  read_at: Date | null;
  created_at: Date;
}

const CONVERSATION_COLUMNS = [
  'id',
  'user_id',
  'shelter_id',
  'pet_id',
  'subject',
  'last_message_at',
  'last_message_preview',
  'last_sender_type',
  'user_unread_count',
  'shelter_unread_count',
  'created_at',
] as const;

const MESSAGE_COLUMNS = [
  'id',
  'conversation_id',
  'sender_type',
  'content',
  'attachment_type',
  'attachment_url',
  'read_at',
  'created_at',
] as const;

@Injectable()
export class MessagingService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly shelters: ShelterDirectory,
  ) {}

  // --- Côté utilisateur ---------------------------------------------------------------

  async openConversation(
    userId: string,
    shelterId: string,
    petId: string | null,
    subject: string | null,
  ): Promise<ConversationRecord> {
    if ((await this.shelters.findSummary(shelterId)) === null) {
      throw AppError.notFoundId('Refuge', shelterId);
    }

    // Idempotent par contexte (user, refuge, animal). NULL animal comparé sans distinction.
    const existing = await this.db
      .selectFrom('conversations')
      .select(CONVERSATION_COLUMNS)
      .where('user_id', '=', userId)
      .where('shelter_id', '=', shelterId)
      .where(sql<boolean>`pet_id IS NOT DISTINCT FROM ${petId}`)
      .executeTakeFirst();
    if (existing) return existing;

    return this.db
      .insertInto('conversations')
      .values({ user_id: userId, shelter_id: shelterId, pet_id: petId, subject })
      .returning(CONVERSATION_COLUMNS)
      .executeTakeFirstOrThrow();
  }

  async listConversations(userId: string): Promise<ConversationRecord[]> {
    return this.db
      .selectFrom('conversations')
      .select(CONVERSATION_COLUMNS)
      .where('user_id', '=', userId)
      .where('archived_by_user', '=', false)
      .orderBy('last_message_at', 'desc')
      .execute();
  }

  async listMessages(userId: string, conversationId: string): Promise<MessageRecord[]> {
    await this.requireOwnership(userId, conversationId);
    return this.messagesOf(conversationId);
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageRecord> {
    await this.requireOwnership(userId, conversationId);
    // L'expéditeur est l'utilisateur ; le refuge gagne un non-lu.
    return this.insertMessage(conversationId, SENDER_USER, userId, content, true);
  }

  async markRead(userId: string, conversationId: string): Promise<void> {
    await this.requireOwnership(userId, conversationId);
    await this.db
      .updateTable('conversations')
      .set({ user_unread_count: 0 })
      .where('id', '=', conversationId)
      .execute();
    await this.markMessagesRead(conversationId, SENDER_SHELTER);
  }

  async unreadCount(userId: string): Promise<number> {
    const row = await this.db
      .selectFrom('conversations')
      .select(sql<number>`COALESCE(SUM(user_unread_count), 0)::bigint`.as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirstOrThrow();
    return row.count;
  }

  // --- Côté refuge ----------------------------------------------------------------------

  async shelterConversations(adminUserId: string): Promise<ConversationRecord[]> {
    const shelterId = await this.requireShelter(adminUserId);
    return this.db
      .selectFrom('conversations')
      .select(CONVERSATION_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .where('archived_by_shelter', '=', false)
      .orderBy('last_message_at', 'desc')
      .execute();
  }

  async shelterMessages(adminUserId: string, conversationId: string): Promise<MessageRecord[]> {
    await this.requireShelterConversation(adminUserId, conversationId);
    return this.messagesOf(conversationId);
  }

  async shelterSend(
    adminUserId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageRecord> {
    await this.requireShelterConversation(adminUserId, conversationId);
    // L'expéditeur est le refuge ; l'adoptant gagne un non-lu.
    return this.insertMessage(conversationId, SENDER_SHELTER, adminUserId, content, false);
  }

  async shelterMarkRead(adminUserId: string, conversationId: string): Promise<void> {
    await this.requireShelterConversation(adminUserId, conversationId);
    await this.db
      .updateTable('conversations')
      .set({ shelter_unread_count: 0 })
      .where('id', '=', conversationId)
      .execute();
    await this.markMessagesRead(conversationId, SENDER_USER);
  }

  async shelterUnreadCount(adminUserId: string): Promise<number> {
    const shelterId = await this.requireShelter(adminUserId);
    const row = await this.db
      .selectFrom('conversations')
      .select(sql<number>`COALESCE(SUM(shelter_unread_count), 0)::bigint`.as('count'))
      .where('shelter_id', '=', shelterId)
      .executeTakeFirstOrThrow();
    return row.count;
  }

  // --- Internes -------------------------------------------------------------------------

  /**
   * Insère un message et met à jour le fil (aperçu, dernier expéditeur, non-lus
   * du destinataire). `recipientIsShelter` : le refuge est le destinataire.
   */
  private async insertMessage(
    conversationId: string,
    senderType: string,
    senderId: string,
    content: string,
    recipientIsShelter: boolean,
  ): Promise<MessageRecord> {
    const message = await this.db
      .insertInto('messages')
      .values({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_id: senderId,
        content,
      })
      .returning(MESSAGE_COLUMNS)
      .executeTakeFirstOrThrow();

    const unreadColumn = recipientIsShelter ? 'shelter_unread_count' : 'user_unread_count';
    await this.db
      .updateTable('conversations')
      .set((eb) => ({
        last_message_at: new Date(),
        last_message_preview: preview(content),
        last_sender_type: senderType,
        [unreadColumn]: eb(eb.ref(unreadColumn), '+', 1),
        updated_at: new Date(),
      }))
      .where('id', '=', conversationId)
      .execute();

    return message;
  }

  private async requireShelter(adminUserId: string): Promise<string> {
    return this.membership.requireAccess(adminUserId, 'messages:read');
  }

  private async requireShelterConversation(
    adminUserId: string,
    conversationId: string,
  ): Promise<ConversationRecord> {
    const shelterId = await this.requireShelter(adminUserId);
    const conversation = await this.db
      .selectFrom('conversations')
      .select(CONVERSATION_COLUMNS)
      .where('id', '=', conversationId)
      .where('shelter_id', '=', shelterId)
      .executeTakeFirst();
    if (!conversation) throw AppError.notFoundId('Conversation', conversationId);
    return conversation;
  }

  private async requireOwnership(
    userId: string,
    conversationId: string,
  ): Promise<ConversationRecord> {
    const conversation = await this.db
      .selectFrom('conversations')
      .select(CONVERSATION_COLUMNS)
      .where('id', '=', conversationId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    if (!conversation) throw AppError.notFoundId('Conversation', conversationId);
    return conversation;
  }

  private async messagesOf(conversationId: string): Promise<MessageRecord[]> {
    return this.db
      .selectFrom('messages')
      .select(MESSAGE_COLUMNS)
      .where('conversation_id', '=', conversationId)
      .orderBy('created_at', 'asc')
      .execute();
  }

  private async markMessagesRead(conversationId: string, senderType: string): Promise<void> {
    await this.db
      .updateTable('messages')
      .set({ read_at: new Date() })
      .where('conversation_id', '=', conversationId)
      .where('sender_type', '=', senderType)
      .where('read_at', 'is', null)
      .execute();
  }
}

/** Tronque l'aperçu à 200 caractères. */
function preview(content: string): string {
  return [...content].slice(0, PREVIEW_MAX).join('');
}
