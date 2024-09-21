import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  conversations,
  messages,
  messageReactions,
  users,
  shelters,
  pets,
} from "@/server/db/schema";
import type {
  MessageAttachment,
  MessageDTO,
  ReactionAgg,
} from "@messaging/bus";
import type { MessageAttachmentMeta } from "../schema";

/**
 * Mappe une row Drizzle de `messages` vers le DTO. Concentre la logique
 * de reconstruction de l'attachment ici pour ne pas la dupliquer dans les
 * trois fonctions de lecture.
 */
type MessageRow = {
  id: string;
  conversationId: string;
  senderType: string;
  senderId: string | null;
  content: string | null;
  attachmentType: string | null;
  attachmentUrl: string | null;
  attachmentMeta: MessageAttachmentMeta | null;
  readAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
};

function rowToMessageDTO(
  row: MessageRow,
  reactions: ReactionAgg[]
): MessageDTO {
  let attachment: MessageAttachment | null = null;
  if (
    (row.attachmentType === "gif" || row.attachmentType === "voice") &&
    row.attachmentUrl &&
    row.attachmentMeta
  ) {
    attachment = {
      type: row.attachmentType,
      url: row.attachmentUrl,
      meta: row.attachmentMeta,
    };
  }
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderType: row.senderType as "user" | "shelter",
    senderId: row.senderId,
    content: row.content,
    attachment,
    readAt: row.readAt,
    editedAt: row.editedAt,
    createdAt: row.createdAt,
    reactions,
  };
}

/**
 * Récupère l'identifiant de l'autre camp dans une conversation, utile pour
 * incrémenter le compteur unread du destinataire et pour envoyer une
 * notification push à la bonne personne.
 */
export async function getConversationParticipants(conversationId: string) {
  const [row] = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      shelterId: conversations.shelterId,
      petId: conversations.petId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return row ?? null;
}

/**
 * Vérifie qu'un user a le droit d'accéder à une conversation : soit il est
 * le particulier (user_id du fil), soit il est shelter_admin du refuge.
 */
export async function canAccessConversation(
  userId: string,
  userRole: string,
  userShelterId: string | null,
  conversationId: string
): Promise<{
  ok: boolean;
  asSide: "user" | "shelter" | null;
  conversation: {
    id: string;
    userId: string;
    shelterId: string;
    petId: string | null;
  } | null;
}> {
  const c = await getConversationParticipants(conversationId);
  if (!c) return { ok: false, asSide: null, conversation: null };

  if (c.userId === userId) {
    return { ok: true, asSide: "user", conversation: c };
  }
  if (
    userRole === "shelter_admin" &&
    userShelterId &&
    c.shelterId === userShelterId
  ) {
    return { ok: true, asSide: "shelter", conversation: c };
  }
  return { ok: false, asSide: null, conversation: c };
}

/**
 * Récupère un message + ses réactions agrégées au format DTO.
 */
export async function getMessageDTO(messageId: string): Promise<MessageDTO | null> {
  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg) return null;

  const reactions = await getReactionsForMessages([msg.id]);
  return rowToMessageDTO(msg, reactions.get(msg.id) ?? []);
}

/**
 * Récupère les réactions agrégées par emoji pour un ensemble de messages.
 * Retourne une Map messageId -> ReactionAgg[] pour usage batch.
 */
export async function getReactionsForMessages(
  messageIds: string[]
): Promise<Map<string, ReactionAgg[]>> {
  const out = new Map<string, ReactionAgg[]>();
  if (messageIds.length === 0) return out;

  const rows = await db
    .select({
      messageId: messageReactions.messageId,
      emoji: messageReactions.emoji,
      userId: messageReactions.userId,
    })
    .from(messageReactions)
    .where(inArray(messageReactions.messageId, messageIds));

  for (const row of rows) {
    let list = out.get(row.messageId);
    if (!list) {
      list = [];
      out.set(row.messageId, list);
    }
    let agg = list.find((r) => r.emoji === row.emoji);
    if (!agg) {
      agg = { emoji: row.emoji, count: 0, userIds: [] };
      list.push(agg);
    }
    agg.count += 1;
    agg.userIds.push(row.userId);
  }
  return out;
}

/**
 * Thread view : messages d'une conversation (chronologique, limité).
 */
export async function getMessagesForConversation(
  conversationId: string,
  limit = 200
): Promise<MessageDTO[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(limit);

  const reactions = await getReactionsForMessages(rows.map((r) => r.id));
  return rows.map((r) => rowToMessageDTO(r, reactions.get(r.id) ?? []));
}

/**
 * Messages depuis un timestamp (pour le fallback polling).
 */
export async function getMessagesSince(
  conversationId: string,
  since: Date
): Promise<MessageDTO[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        gt(messages.createdAt, since)
      )
    )
    .orderBy(messages.createdAt);

  const reactions = await getReactionsForMessages(rows.map((r) => r.id));
  return rows.map((r) => rowToMessageDTO(r, reactions.get(r.id) ?? []));
}

/**
 * Inbox user : toutes les conversations où l'user est le particulier.
 */
export async function getInboxForUser(userId: string) {
  return db
    .select({
      id: conversations.id,
      subject: conversations.subject,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      lastSenderType: conversations.lastSenderType,
      unreadCount: conversations.userUnreadCount,
      archived: conversations.archivedByUser,
      shelterId: conversations.shelterId,
      shelterName: shelters.name,
      shelterLogoUrl: shelters.logoUrl,
      petId: conversations.petId,
      petName: pets.name,
    })
    .from(conversations)
    .innerJoin(shelters, eq(shelters.id, conversations.shelterId))
    .leftJoin(pets, eq(pets.id, conversations.petId))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.archivedByUser, false)
      )
    )
    .orderBy(desc(conversations.lastMessageAt));
}

/**
 * Inbox refuge : toutes les conversations du refuge.
 */
export async function getInboxForShelter(shelterId: string) {
  return db
    .select({
      id: conversations.id,
      subject: conversations.subject,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      lastSenderType: conversations.lastSenderType,
      unreadCount: conversations.shelterUnreadCount,
      archived: conversations.archivedByShelter,
      userId: conversations.userId,
      userName: users.name,
      userImage: users.image,
      petId: conversations.petId,
      petName: pets.name,
    })
    .from(conversations)
    .innerJoin(users, eq(users.id, conversations.userId))
    .leftJoin(pets, eq(pets.id, conversations.petId))
    .where(
      and(
        eq(conversations.shelterId, shelterId),
        eq(conversations.archivedByShelter, false)
      )
    )
    .orderBy(desc(conversations.lastMessageAt));
}

/**
 * Récupère une conversation avec ses métadonnées (refuge, chat, user).
 * Retourne aussi la side de l'appelant pour adapter l'UI.
 */
export async function getConversationContext(conversationId: string) {
  const [row] = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      userName: users.name,
      userImage: users.image,
      shelterId: conversations.shelterId,
      shelterSlug: shelters.slug,
      shelterName: shelters.name,
      shelterLogoUrl: shelters.logoUrl,
      petId: conversations.petId,
      petName: pets.name,
      subject: conversations.subject,
      userUnreadCount: conversations.userUnreadCount,
      shelterUnreadCount: conversations.shelterUnreadCount,
    })
    .from(conversations)
    .innerJoin(users, eq(users.id, conversations.userId))
    .innerJoin(shelters, eq(shelters.id, conversations.shelterId))
    .leftJoin(pets, eq(pets.id, conversations.petId))
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return row ?? null;
}

/**
 * Total unread pour un user sur toutes ses conversations (particulier +
 * éventuel refuge s'il est shelter_admin).
 */
export async function getUnreadCounts(
  userId: string,
  shelterId: string | null
) {
  const [asUser] = await db
    .select({ total: sql<number>`coalesce(sum(${conversations.userUnreadCount}), 0)` })
    .from(conversations)
    .where(eq(conversations.userId, userId));

  let asShelter = 0;
  if (shelterId) {
    const [row] = await db
      .select({
        total: sql<number>`coalesce(sum(${conversations.shelterUnreadCount}), 0)`,
      })
      .from(conversations)
      .where(eq(conversations.shelterId, shelterId));
    asShelter = Number(row?.total ?? 0);
  }

  return {
    asUser: Number(asUser?.total ?? 0),
    asShelter,
  };
}
