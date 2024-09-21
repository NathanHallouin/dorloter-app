/**
 * Services messaging — couche métier réutilisable par les server actions web
 * (avec `requireAuth()` côté caller) ET les routes API v1 (où l'auth passe par
 * le bearer token via `withApi`). Les services prennent `userId` + role +
 * shelterId en paramètres et NE redirigent pas — ils lèvent les erreurs API
 * standardisées (`@infra/api/errors`) à la place.
 *
 * Couvre :
 *   - open conversation
 *   - send message (avec fanout push/email pour les offline)
 *   - mark as read
 *   - inbox user / inbox shelter
 *   - messages d'une conversation (full + incremental via `since`)
 *   - context (refuge, pet, subject, asSide)
 *   - total unread counts
 *
 * Out of MVP mobile : reactions, edit, typing, archive (les actions
 * existantes restent pour le web).
 */

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  conversations,
  messages,
  messageReactions,
  users,
  shelters,
  pets,
} from "@/server/db/schema";
import {
  forbidden,
  notFound,
  rateLimited,
  unprocessable,
  validationFailed,
} from "@infra/api/errors";
import { consumeRateLimit } from "@infra/rate-limit";
import { logEvent } from "@infra/logger";
import { publish } from "@infra/event-bus";
import { messagingBus } from "@messaging/bus";
import { isAllowedEmoji } from "@messaging/emojis";
import {
  canAccessConversation,
  getConversationContext,
  getInboxForShelter,
  getInboxForUser,
  getMessageDTO,
  getMessagesForConversation,
  getMessagesSince,
  getReactionsForMessages,
  getUnreadCounts,
} from "@messaging/queries";
import type { MessageAttachment, MessageDTO, ReactionAgg } from "@messaging/bus";
import type { MessageSentEvent } from "../events";

export type SendMessageAttachment = MessageAttachment;

const MAX_CONTENT = 2000;
const MIN_CONTENT = 1;
const MIN_FIRST_MESSAGE = 10;
const EDIT_WINDOW_MS = 5 * 60 * 1000;
const TYPING_TTL_MS = 5_000;

export interface MessagingUserContext {
  userId: string;
  userRole: string;
  userShelterId: string | null;
}

// ─── openConversation ──────────────────────────────────────────────────────

export interface OpenConversationInput {
  shelterId: string;
  petId?: string | null;
  firstMessage: string;
}

export async function openConversationService(
  userId: string,
  input: OpenConversationInput
): Promise<{ conversationId: string; isNew: boolean }> {
  if (
    !input.firstMessage ||
    input.firstMessage.length < MIN_FIRST_MESSAGE ||
    input.firstMessage.length > MAX_CONTENT
  ) {
    throw validationFailed(
      `Le premier message doit faire entre ${MIN_FIRST_MESSAGE} et ${MAX_CONTENT} caractères.`
    );
  }

  const rate = await consumeRateLimit({
    key: `messaging:open:${userId}`,
    limit: 5,
    windowSec: 3600,
  });
  if (!rate.ok) throw rateLimited(rate.retryAfter);

  const [shelter] = await db
    .select({ id: shelters.id })
    .from(shelters)
    .where(eq(shelters.id, input.shelterId))
    .limit(1);
  if (!shelter) throw notFound("Refuge", input.shelterId);

  if (input.petId) {
    const [pet] = await db
      .select({ id: pets.id, shelterId: pets.shelterId })
      .from(pets)
      .where(eq(pets.id, input.petId))
      .limit(1);
    if (!pet) throw notFound("Animal", input.petId);
    if (pet.shelterId !== input.shelterId) {
      throw validationFailed("Cet animal n'appartient pas au refuge demandé.");
    }
  }

  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.shelterId, input.shelterId),
        input.petId
          ? eq(conversations.petId, input.petId)
          : isNull(conversations.petId)
      )
    )
    .limit(1);

  let conversationId: string;
  let isNew = false;
  if (existing[0]) {
    conversationId = existing[0].id;
  } else {
    const [row] = await db
      .insert(conversations)
      .values({
        userId,
        shelterId: input.shelterId,
        petId: input.petId ?? null,
      })
      .returning({ id: conversations.id });
    conversationId = row!.id;
    isNew = true;
  }

  await insertMessageCore({
    conversationId,
    senderId: userId,
    senderType: "user",
    content: input.firstMessage,
    isFirstMessage: isNew,
  });

  logEvent(
    "conversation.opened",
    { conversationId, shelterId: input.shelterId, petId: input.petId ?? null },
    { userId }
  );

  return { conversationId, isNew };
}

// ─── sendMessage ───────────────────────────────────────────────────────────

export async function sendMessageService(
  ctx: MessagingUserContext,
  conversationId: string,
  payload: { content?: string | null; attachment?: SendMessageAttachment | null }
): Promise<{ messageId: string }> {
  const content = (payload.content ?? "").trim();
  const attachment = payload.attachment ?? null;

  if (!content && !attachment) {
    throw validationFailed(
      "Le message doit contenir au moins du texte ou une pièce jointe."
    );
  }
  if (content && (content.length < MIN_CONTENT || content.length > MAX_CONTENT)) {
    throw validationFailed("Message invalide.");
  }
  if (attachment) {
    validateAttachment(attachment);
  }

  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    conversationId
  );
  if (!access.ok || !access.asSide) {
    throw notFound("Conversation", conversationId);
  }

  const rate = await consumeRateLimit({
    key: `messaging:send:${ctx.userId}`,
    limit: 30,
    windowSec: 3600,
  });
  if (!rate.ok) throw rateLimited(rate.retryAfter);

  return insertMessageCore({
    conversationId,
    senderId: ctx.userId,
    senderType: access.asSide,
    content: content || null,
    attachment,
  });
}

function validateAttachment(attachment: SendMessageAttachment): void {
  if (attachment.type !== "gif" && attachment.type !== "voice") {
    throw validationFailed("Type d'attachement invalide.");
  }
  if (!attachment.url || attachment.url.length > 2048) {
    throw validationFailed("URL d'attachement invalide.");
  }
  if (attachment.type === "gif") {
    if (
      attachment.meta.type !== "gif" ||
      !attachment.meta.previewUrl ||
      !Number.isFinite(attachment.meta.width) ||
      !Number.isFinite(attachment.meta.height)
    ) {
      throw validationFailed("Métadonnées GIF invalides.");
    }
  }
  if (attachment.type === "voice") {
    if (
      attachment.meta.type !== "voice" ||
      !Number.isFinite(attachment.meta.durationMs) ||
      attachment.meta.durationMs < 200 ||
      attachment.meta.durationMs > 5 * 60 * 1000
    ) {
      throw validationFailed(
        "Message vocal invalide (200ms à 5 minutes)."
      );
    }
  }
}

// ─── markConversationRead ──────────────────────────────────────────────────

export async function markConversationReadService(
  ctx: MessagingUserContext,
  conversationId: string
): Promise<{ markedCount: number }> {
  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    conversationId
  );
  if (!access.ok || !access.asSide) {
    throw notFound("Conversation", conversationId);
  }

  const now = new Date();
  const otherSide = access.asSide === "user" ? "shelter" : "user";
  const updated = await db
    .update(messages)
    .set({ readAt: now })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.senderType, otherSide),
        isNull(messages.readAt)
      )
    )
    .returning({ id: messages.id });

  if (access.asSide === "user") {
    await db
      .update(conversations)
      .set({ userUnreadCount: 0, updatedAt: now })
      .where(eq(conversations.id, conversationId));
  } else {
    await db
      .update(conversations)
      .set({ shelterUnreadCount: 0, updatedAt: now })
      .where(eq(conversations.id, conversationId));
  }

  if (updated.length > 0) {
    messagingBus.publish({
      type: "conversation.read",
      conversationId,
      readerId: ctx.userId,
      readAt: now,
      messageIds: updated.map((r) => r.id),
    });
  }

  return { markedCount: updated.length };
}

// ─── listInbox ─────────────────────────────────────────────────────────────

export async function listInboxService(
  ctx: MessagingUserContext,
  side: "user" | "shelter"
) {
  if (side === "user") {
    return getInboxForUser(ctx.userId);
  }
  if (ctx.userRole !== "shelter_admin" || !ctx.userShelterId) {
    throw forbidden("Mode refuge réservé aux admins de refuge.");
  }
  return getInboxForShelter(ctx.userShelterId);
}

// ─── getMessages ───────────────────────────────────────────────────────────

export interface GetMessagesOptions {
  /** Si fourni, ne renvoie que les messages créés strictement après cette date (polling). */
  since?: Date;
}

export async function getMessagesService(
  ctx: MessagingUserContext,
  conversationId: string,
  options: GetMessagesOptions = {}
): Promise<MessageDTO[]> {
  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    conversationId
  );
  if (!access.ok) throw notFound("Conversation", conversationId);

  if (options.since) {
    return getMessagesSince(conversationId, options.since);
  }
  return getMessagesForConversation(conversationId, 200);
}

// ─── getConversationContext ────────────────────────────────────────────────

export async function getConversationContextService(
  ctx: MessagingUserContext,
  conversationId: string
) {
  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    conversationId
  );
  if (!access.ok || !access.asSide) {
    throw notFound("Conversation", conversationId);
  }

  const context = await getConversationContext(conversationId);
  if (!context) throw notFound("Conversation", conversationId);

  return {
    ...context,
    asSide: access.asSide,
  };
}

// ─── getUnreadCount ────────────────────────────────────────────────────────

export async function getUnreadCountService(ctx: MessagingUserContext) {
  const counts = await getUnreadCounts(ctx.userId, ctx.userShelterId);
  return {
    asUser: counts.asUser,
    asShelter: counts.asShelter,
    total: counts.asUser + counts.asShelter,
  };
}

// ─── editMessage ───────────────────────────────────────────────────────────

export async function editMessageService(
  ctx: MessagingUserContext,
  messageId: string,
  content: string
): Promise<MessageDTO> {
  const trimmed = content.trim();
  if (trimmed.length < MIN_CONTENT || trimmed.length > MAX_CONTENT) {
    throw validationFailed("Message invalide.");
  }

  const [existing] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!existing) throw notFound("Message", messageId);
  if (existing.senderId !== ctx.userId) {
    throw forbidden("Vous ne pouvez modifier que vos propres messages.");
  }
  if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw unprocessable(
      "L'édition n'est plus possible (fenêtre de 5 minutes dépassée)."
    );
  }

  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    existing.conversationId
  );
  if (!access.ok) throw notFound("Conversation", existing.conversationId);

  await db
    .update(messages)
    .set({ content: trimmed, editedAt: new Date() })
    .where(eq(messages.id, messageId));

  const dto = await getMessageDTO(messageId);
  if (!dto) throw notFound("Message", messageId);

  messagingBus.publish({
    type: "message.updated",
    conversationId: existing.conversationId,
    message: dto,
  });

  return dto;
}

// ─── toggleReaction ────────────────────────────────────────────────────────

export async function toggleReactionService(
  ctx: MessagingUserContext,
  messageId: string,
  emoji: string
): Promise<{ added: boolean; reactions: ReactionAgg[] }> {
  if (!isAllowedEmoji(emoji)) {
    throw validationFailed("Emoji non autorisé.");
  }

  const [msg] = await db
    .select({ id: messages.id, conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg) throw notFound("Message", messageId);

  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    msg.conversationId
  );
  if (!access.ok) throw notFound("Conversation", msg.conversationId);

  const rate = await consumeRateLimit({
    key: `messaging:react:${ctx.userId}`,
    limit: 60,
    windowSec: 60,
  });
  if (!rate.ok) throw rateLimited(rate.retryAfter);

  const existing = await db
    .delete(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, ctx.userId),
        eq(messageReactions.emoji, emoji)
      )
    )
    .returning({ id: messageReactions.id });

  let added = false;
  if (existing.length === 0) {
    await db.insert(messageReactions).values({
      messageId,
      userId: ctx.userId,
      emoji,
    });
    added = true;
  }

  const aggMap = await getReactionsForMessages([messageId]);
  const reactions = aggMap.get(messageId) ?? [];

  messagingBus.publish({
    type: "reaction.toggled",
    conversationId: msg.conversationId,
    messageId,
    reactions,
  });

  return { added, reactions };
}

// ─── Typing indicator (in-memory, single-process) ─────────────────────────
//
// On garde le suivi du typing en mémoire — c'est volatil, court (5s TTL),
// et il n'y a aucun intérêt à le persister. Pour scaler horizontalement,
// remplacer par un Redis avec `SETEX convId:userId 5 "1"`.

declare global {
  // eslint-disable-next-line no-var
  var __messagingTyping: Map<string, Map<string, number>> | undefined;
}
const typingMap: Map<string, Map<string, number>> =
  globalThis.__messagingTyping ?? new Map();
if (!globalThis.__messagingTyping) {
  globalThis.__messagingTyping = typingMap;
}

export async function setTypingService(
  ctx: MessagingUserContext,
  conversationId: string,
  isTyping: boolean
): Promise<{ ok: true }> {
  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    conversationId
  );
  if (!access.ok) throw notFound("Conversation", conversationId);

  let convMap = typingMap.get(conversationId);
  if (!convMap) {
    convMap = new Map();
    typingMap.set(conversationId, convMap);
  }
  if (isTyping) {
    convMap.set(ctx.userId, Date.now() + TYPING_TTL_MS);
  } else {
    convMap.delete(ctx.userId);
  }

  // Publish sur le bus pour les clients SSE web (mobile lit via polling)
  messagingBus.publish({
    type: "typing.changed",
    conversationId,
    userId: ctx.userId,
    isTyping,
  });

  return { ok: true };
}

export async function getTypingService(
  ctx: MessagingUserContext,
  conversationId: string
): Promise<{ userIds: string[] }> {
  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    conversationId
  );
  if (!access.ok) throw notFound("Conversation", conversationId);

  const convMap = typingMap.get(conversationId);
  if (!convMap) return { userIds: [] };

  const now = Date.now();
  const userIds: string[] = [];
  for (const [userId, expiresAt] of convMap) {
    if (expiresAt <= now) {
      convMap.delete(userId);
      continue;
    }
    // On ne signale pas l'utilisateur courant à lui-même.
    if (userId !== ctx.userId) userIds.push(userId);
  }
  return { userIds };
}

// ─── archiveConversation ───────────────────────────────────────────────────

export async function archiveConversationService(
  ctx: MessagingUserContext,
  conversationId: string
): Promise<{ archived: true }> {
  const access = await canAccessConversation(
    ctx.userId,
    ctx.userRole,
    ctx.userShelterId,
    conversationId
  );
  if (!access.ok || !access.asSide) {
    throw notFound("Conversation", conversationId);
  }

  const now = new Date();
  if (access.asSide === "user") {
    await db
      .update(conversations)
      .set({ archivedByUser: true, updatedAt: now })
      .where(eq(conversations.id, conversationId));
  } else {
    await db
      .update(conversations)
      .set({ archivedByShelter: true, updatedAt: now })
      .where(eq(conversations.id, conversationId));
  }

  return { archived: true };
}

// ─── Internals (insert + fanout) ───────────────────────────────────────────

async function insertMessageCore(args: {
  conversationId: string;
  senderId: string;
  senderType: "user" | "shelter";
  content: string | null;
  attachment?: SendMessageAttachment | null;
  isFirstMessage?: boolean;
}): Promise<{ messageId: string }> {
  const content = args.content ? args.content.trim() : null;
  const attachment = args.attachment ?? null;
  const preview = previewOf(content, attachment);

  const [row] = await db
    .insert(messages)
    .values({
      conversationId: args.conversationId,
      senderType: args.senderType,
      senderId: args.senderId,
      content,
      attachmentType: attachment?.type ?? null,
      attachmentUrl: attachment?.url ?? null,
      attachmentMeta: attachment?.meta ?? null,
    })
    .returning({ id: messages.id });
  const messageId = row!.id;

  const unreadColumn =
    args.senderType === "user" ? "shelter_unread_count" : "user_unread_count";

  await db.execute(sql`
    UPDATE conversations
    SET last_message_at = NOW(),
        last_message_preview = ${preview},
        last_sender_type = ${args.senderType},
        ${sql.raw(unreadColumn)} = ${sql.raw(unreadColumn)} + 1,
        archived_by_user = false,
        archived_by_shelter = false,
        updated_at = NOW()
    WHERE id = ${args.conversationId}
  `);

  const dto = await getMessageDTO(messageId);
  if (dto) {
    messagingBus.publish({
      type: "message.created",
      conversationId: args.conversationId,
      message: dto,
    });
  }

  void fanoutMessageNotifications({
    conversationId: args.conversationId,
    senderId: args.senderId,
    senderType: args.senderType,
    preview,
    isFirstMessage: args.isFirstMessage ?? false,
  }).catch((err) =>
    logEvent(
      "messaging.fanout_failed",
      { error: err instanceof Error ? err.message : String(err) },
      { level: "error" }
    )
  );

  logEvent(
    "message.sent",
    {
      conversationId: args.conversationId,
      messageId,
      senderType: args.senderType,
      contentLength: content?.length ?? 0,
      attachmentType: attachment?.type ?? null,
    },
    { userId: args.senderId }
  );

  return { messageId };
}

function previewOf(
  content: string | null,
  attachment: SendMessageAttachment | null
): string {
  if (content) {
    const trimmed = content.replace(/\s+/g, " ").trim();
    if (trimmed) return trimmed.length > 180 ? trimmed.slice(0, 177) + "…" : trimmed;
  }
  if (attachment?.type === "gif") return "🎞️ GIF";
  if (attachment?.type === "voice") return "🎙️ Message vocal";
  return "";
}

async function fanoutMessageNotifications(args: {
  conversationId: string;
  senderId: string;
  senderType: "user" | "shelter";
  preview: string;
  isFirstMessage: boolean;
}) {
  const [conv] = await db
    .select({
      userId: conversations.userId,
      shelterId: conversations.shelterId,
      petId: conversations.petId,
    })
    .from(conversations)
    .where(eq(conversations.id, args.conversationId))
    .limit(1);
  if (!conv) return;

  const recipients = await resolveRecipients(
    args.senderType,
    args.senderId,
    conv.userId,
    conv.shelterId
  );

  const offline = recipients
    .filter((r) => !messagingBus.isOnline(args.conversationId, r.id))
    .map((r) => ({ userId: r.id, side: r.side }));

  if (offline.length === 0) return;

  const { senderName, petName } = await resolveSenderAndPetName(
    args.senderType,
    args.senderId,
    conv.shelterId,
    conv.petId
  );

  publish<MessageSentEvent>({
    type: "messaging.message_sent",
    conversationId: args.conversationId,
    senderType: args.senderType,
    senderName,
    preview: args.preview,
    isFirstMessage: args.isFirstMessage,
    petName,
    recipients: offline,
  });
}

async function resolveRecipients(
  senderType: "user" | "shelter",
  senderId: string,
  conversationUserId: string,
  conversationShelterId: string
): Promise<Array<{ id: string; side: "user" | "shelter" }>> {
  if (senderType === "user") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.shelterId, conversationShelterId),
          eq(users.role, "shelter_admin"),
          ne(users.id, senderId)
        )
      );
    return admins.map((a) => ({ id: a.id, side: "shelter" as const }));
  }
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, conversationUserId))
    .limit(1);
  if (!user) return [];
  return [{ id: user.id, side: "user" as const }];
}

async function resolveSenderAndPetName(
  senderType: "user" | "shelter",
  senderId: string,
  conversationShelterId: string,
  conversationPetId: string | null
): Promise<{ senderName: string; petName: string | null }> {
  let senderName = "un contact";
  if (senderType === "user") {
    const [u] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);
    if (u) senderName = u.name;
  } else {
    const [s] = await db
      .select({ name: shelters.name })
      .from(shelters)
      .where(eq(shelters.id, conversationShelterId))
      .limit(1);
    if (s) senderName = s.name;
  }

  let petName: string | null = null;
  if (conversationPetId) {
    const [p] = await db
      .select({ name: pets.name })
      .from(pets)
      .where(eq(pets.id, conversationPetId))
      .limit(1);
    if (p) petName = p.name;
  }

  return { senderName, petName };
}
