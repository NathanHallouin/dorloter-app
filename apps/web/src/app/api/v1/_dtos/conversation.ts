/**
 * DTOs messaging — payloads API stables pour les conversations et messages.
 *
 * Conventions :
 *   - Dates en ISO 8601 (UTC)
 *   - IDs en UUID v4
 *   - `asSide` : côté de la conversation que représente l'appelant
 *     ("user" pour un particulier, "shelter" pour un shelter_admin)
 */

import type { MessageDTO } from "@messaging/public";

export interface ReactionAggDto {
  emoji: string;
  count: number;
  /** IDs des users ayant réagi (visibles uniquement aux participants). */
  userIds: string[];
}

export type MessageAttachmentMetaDto =
  | {
      type: "gif";
      provider: "tenor";
      externalId: string;
      width: number;
      height: number;
      previewUrl: string;
    }
  | {
      type: "voice";
      durationMs: number;
      mimeType: string;
    };

export interface MessageAttachmentDto {
  type: "gif" | "voice";
  url: string;
  meta: MessageAttachmentMetaDto;
}

export interface MessageApiDto {
  id: string;
  conversationId: string;
  senderType: "user" | "shelter";
  senderId: string | null;
  /** Texte du message — `null` si message GIF/vocal sans légende. */
  content: string | null;
  attachment: MessageAttachmentDto | null;
  readAt: string | null;
  editedAt: string | null;
  createdAt: string;
  reactions: ReactionAggDto[];
}

export function toMessageApiDto(m: MessageDTO): MessageApiDto {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType,
    senderId: m.senderId,
    content: m.content,
    attachment: m.attachment
      ? {
          type: m.attachment.type,
          url: m.attachment.url,
          meta: m.attachment.meta as MessageAttachmentMetaDto,
        }
      : null,
    readAt: m.readAt ? m.readAt.toISOString() : null,
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      userIds: r.userIds,
    })),
  };
}

export interface InboxItemDto {
  id: string;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderType: "user" | "shelter" | null;
  unreadCount: number;
  petId: string | null;
  petName: string | null;
  /** Côté shelter (mode shelter_admin) : infos du particulier ; sinon : infos du refuge. */
  peerId: string;
  peerName: string;
  peerImageUrl: string | null;
}

interface UserInboxRow {
  id: string;
  subject: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  lastSenderType: string | null;
  unreadCount: number;
  shelterId: string;
  shelterName: string;
  shelterLogoUrl: string | null;
  petId: string | null;
  petName: string | null;
}

interface ShelterInboxRow {
  id: string;
  subject: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  lastSenderType: string | null;
  unreadCount: number;
  userId: string;
  userName: string;
  userImage: string | null;
  petId: string | null;
  petName: string | null;
}

export function toUserInboxDto(row: UserInboxRow): InboxItemDto {
  return {
    id: row.id,
    subject: row.subject,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessagePreview: row.lastMessagePreview,
    lastSenderType: row.lastSenderType as "user" | "shelter" | null,
    unreadCount: row.unreadCount,
    petId: row.petId,
    petName: row.petName,
    peerId: row.shelterId,
    peerName: row.shelterName,
    peerImageUrl: row.shelterLogoUrl,
  };
}

export function toShelterInboxDto(row: ShelterInboxRow): InboxItemDto {
  return {
    id: row.id,
    subject: row.subject,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessagePreview: row.lastMessagePreview,
    lastSenderType: row.lastSenderType as "user" | "shelter" | null,
    unreadCount: row.unreadCount,
    petId: row.petId,
    petName: row.petName,
    peerId: row.userId,
    peerName: row.userName,
    peerImageUrl: row.userImage,
  };
}

export interface ConversationContextDto {
  id: string;
  asSide: "user" | "shelter";
  subject: string | null;
  petId: string | null;
  petName: string | null;
  /** Refuge associé (vu côté user) ou particulier (vu côté shelter). */
  peerId: string;
  peerName: string;
  peerImageUrl: string | null;
  /** Slug du refuge si le peer est un refuge ; `null` côté shelter_admin
   *  (le peer est un particulier — pas de page publique sur mobile). */
  peerSlug: string | null;
  unreadCount: number;
}

interface ConversationContextRow {
  id: string;
  asSide: "user" | "shelter";
  subject: string | null;
  petId: string | null;
  petName: string | null;
  userId: string;
  userName: string;
  userImage: string | null;
  shelterId: string;
  shelterSlug: string;
  shelterName: string;
  shelterLogoUrl: string | null;
  userUnreadCount: number;
  shelterUnreadCount: number;
}

export function toConversationContextDto(
  row: ConversationContextRow
): ConversationContextDto {
  const isUserSide = row.asSide === "user";
  return {
    id: row.id,
    asSide: row.asSide,
    subject: row.subject,
    petId: row.petId,
    petName: row.petName,
    peerId: isUserSide ? row.shelterId : row.userId,
    peerName: isUserSide ? row.shelterName : row.userName,
    peerImageUrl: isUserSide ? row.shelterLogoUrl : row.userImage,
    peerSlug: isUserSide ? row.shelterSlug : null,
    unreadCount: isUserSide ? row.userUnreadCount : row.shelterUnreadCount,
  };
}
