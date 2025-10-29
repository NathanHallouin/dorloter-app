/**
 * Endpoints du module Messaging : messagerie côté utilisateur
 * (`/api/v1/conversations`) et côté refuge (`/api/v1/shelter/conversations`).
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { toIso, toIsoOrNull } from '../../shared/format';
import {
  MessagingService,
  type ConversationRecord,
  type MessageRecord,
} from './messaging.service';

export class CreateConversationDto {
  @IsUUID('4', { message: 'Refuge invalide.' })
  shelterId!: string;

  @IsOptional() @IsUUID('4', { message: 'Animal invalide.' })
  petId?: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Objet trop long.' })
  subject?: string;
}

export class SendMessageDto {
  @IsString({ message: 'Message invalide.' })
  @Length(1, 5000, { message: 'Le message doit faire entre 1 et 5000 caractères.' })
  content!: string;
}

/** Conversation vue côté utilisateur (le compteur de non-lus est le sien). */
interface ConversationDto {
  id: string;
  shelterId: string;
  petId: string | null;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderType: string | null;
  unreadCount: number;
  createdAt: string;
}

/** Conversation vue côté refuge (le compteur de non-lus est celui du refuge). */
interface ShelterConversationDto {
  id: string;
  userId: string;
  petId: string | null;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderType: string | null;
  unreadCount: number;
  createdAt: string;
}

/** Message d'une conversation (vue commune utilisateur et refuge). */
interface MessageDto {
  id: string;
  conversationId: string;
  senderType: string;
  content: string | null;
  attachmentType: string | null;
  attachmentUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

function toConversationDto(conversation: ConversationRecord): ConversationDto {
  return {
    id: conversation.id,
    shelterId: conversation.shelter_id,
    petId: conversation.pet_id,
    subject: conversation.subject,
    lastMessageAt: toIso(conversation.last_message_at),
    lastMessagePreview: conversation.last_message_preview,
    lastSenderType: conversation.last_sender_type,
    unreadCount: conversation.user_unread_count,
    createdAt: toIso(conversation.created_at),
  };
}

function toShelterConversationDto(conversation: ConversationRecord): ShelterConversationDto {
  return {
    id: conversation.id,
    userId: conversation.user_id,
    petId: conversation.pet_id,
    subject: conversation.subject,
    lastMessageAt: toIso(conversation.last_message_at),
    lastMessagePreview: conversation.last_message_preview,
    lastSenderType: conversation.last_sender_type,
    unreadCount: conversation.shelter_unread_count,
    createdAt: toIso(conversation.created_at),
  };
}

function toMessageDto(message: MessageRecord): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderType: message.sender_type,
    content: message.content,
    attachmentType: message.attachment_type,
    attachmentUrl: message.attachment_url,
    readAt: toIsoOrNull(message.read_at),
    createdAt: toIso(message.created_at),
  };
}

@Controller('api/v1')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  // --- Côté utilisateur -----------------------------------------------------------

  @Get('conversations')
  @Auth()
  async list(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<ConversationDto[]>> {
    const rows = await this.messaging.listConversations(current.userId);
    return ok(rows.map(toConversationDto));
  }

  @Post('conversations')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async open(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateConversationDto,
  ): Promise<ApiResponse<ConversationDto>> {
    const conversation = await this.messaging.openConversation(
      current.userId,
      dto.shelterId,
      dto.petId ?? null,
      dto.subject ?? null,
    );
    return ok(toConversationDto(conversation));
  }

  @Get('conversations/unread-count')
  @Auth()
  async unreadCount(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<{ count: number }>> {
    return ok({ count: await this.messaging.unreadCount(current.userId) });
  }

  @Get('conversations/:id/messages')
  @Auth()
  async messages(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<MessageDto[]>> {
    const rows = await this.messaging.listMessages(current.userId, id);
    return ok(rows.map(toMessageDto));
  }

  @Post('conversations/:id/messages')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async send(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<ApiResponse<MessageDto>> {
    const message = await this.messaging.sendMessage(current.userId, id, dto.content);
    return ok(toMessageDto(message));
  }

  @Post('conversations/:id/read')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.messaging.markRead(current.userId, id);
  }

  // --- Côté refuge ------------------------------------------------------------------

  @Get('shelter/conversations')
  @Auth()
  async shelterList(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<ShelterConversationDto[]>> {
    const rows = await this.messaging.shelterConversations(current.userId);
    return ok(rows.map(toShelterConversationDto));
  }

  @Get('shelter/conversations/unread-count')
  @Auth()
  async shelterUnreadCount(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<{ count: number }>> {
    return ok({ count: await this.messaging.shelterUnreadCount(current.userId) });
  }

  @Get('shelter/conversations/:id/messages')
  @Auth()
  async shelterMessages(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<MessageDto[]>> {
    const rows = await this.messaging.shelterMessages(current.userId, id);
    return ok(rows.map(toMessageDto));
  }

  @Post('shelter/conversations/:id/messages')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async shelterSend(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<ApiResponse<MessageDto>> {
    const message = await this.messaging.shelterSend(current.userId, id, dto.content);
    return ok(toMessageDto(message));
  }

  @Post('shelter/conversations/:id/read')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async shelterMarkRead(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.messaging.shelterMarkRead(current.userId, id);
  }
}
