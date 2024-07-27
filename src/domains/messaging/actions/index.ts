"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@infra/db";
import {
  conversations,
  messages,
  messageReactions,
  users,
  shelters,
  pets,
} from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { consumeRateLimit } from "@infra/rate-limit";
import { logEvent } from "@infra/logger";
import { isAllowedEmoji } from "@messaging/emojis";
import { messagingBus } from "@messaging/bus";
import {
  canAccessConversation,
  getMessageDTO,
  getReactionsForMessages,
} from "@messaging/queries";
import { publish } from "@infra/event-bus";
import type { MessageSentEvent } from "../events";
import type { ActionResponse } from "@/types";

const MAX_CONTENT = 2000;
const MIN_CONTENT = 1;
const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 min

// ─── Helpers partagés ───────────────────────────────────────────────────────

type GrantedAccess = {
  ok: true;
  asSide: "user" | "shelter";
  conversation: {
    id: string;
    userId: string;
    shelterId: string;
    petId: string | null;
  };
};

async function requireConversationAccess(conversationId: string) {
  const session = await requireAuth();
  const access = await canAccessConversation(
    session.user.id,
    session.user.role,
    session.user.shelterId ?? null,
    conversationId
  );
  if (!access.ok || !access.asSide || !access.conversation) {
    return { error: "Conversation introuvable ou non autorisée." as const };
  }
  return {
    session,
    access: access as GrantedAccess,
  };
}

function previewOf(content: string): string {
  const trimmed = content.replace(/\s+/g, " ").trim();
  return trimmed.length > 180 ? trimmed.slice(0, 177) + "…" : trimmed;
}

// ─── openConversation ──────────────────────────────────────────────────────

const openSchema = z.object({
  shelterId: z.string().uuid(),
  petId: z.string().uuid().optional(),
  firstMessage: z.string().min(10).max(MAX_CONTENT),
});

export async function openConversation(
  input: z.infer<typeof openSchema>
): Promise<ActionResponse<{ conversationId: string }>> {
  const session = await requireAuth();

  const rate = await consumeRateLimit({
    key: "messaging:open",
    limit: 5,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Trop de nouvelles conversations récentes. Réessayez dans ${Math.ceil(rate.retryAfter / 60)} min.`,
    };
  }

  const parsed = openSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }
  const { shelterId, petId, firstMessage } = parsed.data;

  // Upsert : une conversation unique par (user, shelter, pet)
  // Postgres n'accepte pas COALESCE dans un ON CONFLICT target, donc on
  // cherche d'abord puis on insère si absent.
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, session.user.id),
        eq(conversations.shelterId, shelterId),
        petId
          ? eq(conversations.petId, petId)
          : isNull(conversations.petId)
      )
    )
    .limit(1);

  let conversationId: string;
  if (existing[0]) {
    conversationId = existing[0].id;
  } else {
    const [row] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        shelterId,
        petId: petId ?? null,
      })
      .returning({ id: conversations.id });
    conversationId = row!.id;
  }

  // Insère le 1er message
  const result = await insertMessage({
    conversationId,
    senderId: session.user.id,
    senderType: "user",
    content: firstMessage,
    isFirstMessage: !existing[0],
  });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  logEvent(
    "conversation.opened",
    { conversationId, shelterId, petId: petId ?? null },
    { userId: session.user.id }
  );

  revalidatePath("/messages");
  revalidatePath("/shelter-messages");

  return { success: true, data: { conversationId } };
}

// ─── sendMessage ───────────────────────────────────────────────────────────

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(MIN_CONTENT).max(MAX_CONTENT),
});

export async function sendMessage(
  input: z.infer<typeof sendSchema>
): Promise<ActionResponse<{ messageId: string }>> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Message invalide." };
  }

  const guard = await requireConversationAccess(parsed.data.conversationId);
  if ("error" in guard) return { success: false, error: guard.error };
  const { session, access } = guard;

  const rate = await consumeRateLimit({
    key: "messaging:send",
    limit: 30,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Trop de messages envoyés récemment. Réessayez dans ${Math.ceil(rate.retryAfter / 60)} min.`,
    };
  }

  return insertMessage({
    conversationId: access.conversation.id,
    senderId: session.user.id,
    senderType: access.asSide,
    content: parsed.data.content,
  });
}

async function insertMessage(args: {
  conversationId: string;
  senderId: string;
  senderType: "user" | "shelter";
  content: string;
  isFirstMessage?: boolean;
}): Promise<ActionResponse<{ messageId: string }>> {
  const content = args.content.trim();
  const preview = previewOf(content);

  const [row] = await db
    .insert(messages)
    .values({
      conversationId: args.conversationId,
      senderType: args.senderType,
      senderId: args.senderId,
      content,
    })
    .returning({ id: messages.id });
  const messageId = row!.id;

  // Met à jour la conversation : last_message_*, increment unread côté
  // destinataire uniquement. On utilise NOW() en SQL direct plutôt qu'un
  // Date JS — postgres-js ne sait pas sérialiser un Date dans un template
  // sql`...` et crashe avec "The \"string\" argument must be of type string".
  const unreadColumn =
    args.senderType === "user"
      ? "shelter_unread_count"
      : "user_unread_count";

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

  // Publie sur le bus pour les streams SSE
  const dto = await getMessageDTO(messageId);
  if (dto) {
    messagingBus.publish({
      type: "message.created",
      conversationId: args.conversationId,
      message: dto,
    });
  }

  // Fanout push / email si le destinataire n'a pas de SSE actif
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
      contentLength: content.length,
    },
    { userId: args.senderId }
  );

  revalidatePath("/messages");
  revalidatePath(`/messages/${args.conversationId}`);
  revalidatePath("/shelter-messages");
  revalidatePath(`/shelter-messages/${args.conversationId}`);

  return { success: true, data: { messageId } };
}

// ─── editMessage ───────────────────────────────────────────────────────────

const editSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(MIN_CONTENT).max(MAX_CONTENT),
});

export async function editMessage(
  input: z.infer<typeof editSchema>
): Promise<ActionResponse> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const session = await requireAuth();

  const [existing] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, parsed.data.messageId))
    .limit(1);
  if (!existing) return { success: false, error: "Message introuvable." };
  if (existing.senderId !== session.user.id) {
    return { success: false, error: "Non autorisé." };
  }
  if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS) {
    return {
      success: false,
      error: "L'édition n'est plus possible (fenêtre de 5 minutes dépassée).",
    };
  }

  const content = parsed.data.content.trim();
  await db
    .update(messages)
    .set({ content, editedAt: new Date() })
    .where(eq(messages.id, parsed.data.messageId));

  const dto = await getMessageDTO(parsed.data.messageId);
  if (dto) {
    messagingBus.publish({
      type: "message.updated",
      conversationId: existing.conversationId,
      message: dto,
    });
  }

  return { success: true };
}

// ─── toggleReaction ────────────────────────────────────────────────────────

const reactSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
});

export async function toggleReaction(
  input: z.infer<typeof reactSchema>
): Promise<ActionResponse<{ added: boolean }>> {
  const parsed = reactSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };
  if (!isAllowedEmoji(parsed.data.emoji)) {
    return { success: false, error: "Emoji non autorisé." };
  }

  const session = await requireAuth();

  const [msg] = await db
    .select({ id: messages.id, conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, parsed.data.messageId))
    .limit(1);
  if (!msg) return { success: false, error: "Message introuvable." };

  const guard = await requireConversationAccess(msg.conversationId);
  if ("error" in guard) return { success: false, error: guard.error };

  const rate = await consumeRateLimit({
    key: "messaging:react",
    limit: 60,
    windowSec: 60,
  });
  if (!rate.ok) return { success: false, error: "Trop de réactions." };

  // Toggle : delete si existe, insert sinon (sémantique Slack/Telegram)
  const existing = await db
    .delete(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, parsed.data.messageId),
        eq(messageReactions.userId, session.user.id),
        eq(messageReactions.emoji, parsed.data.emoji)
      )
    )
    .returning({ id: messageReactions.id });

  let added = false;
  if (existing.length === 0) {
    await db.insert(messageReactions).values({
      messageId: parsed.data.messageId,
      userId: session.user.id,
      emoji: parsed.data.emoji,
    });
    added = true;
  }

  // Recalcule agrégation + publie
  const aggMap = await getReactionsForMessages([parsed.data.messageId]);
  messagingBus.publish({
    type: "reaction.toggled",
    conversationId: msg.conversationId,
    messageId: parsed.data.messageId,
    reactions: aggMap.get(parsed.data.messageId) ?? [],
  });

  return { success: true, data: { added } };
}

// ─── markConversationRead ──────────────────────────────────────────────────

export async function markConversationRead(
  conversationId: string
): Promise<ActionResponse> {
  const guard = await requireConversationAccess(conversationId);
  if ("error" in guard) return { success: false, error: guard.error };
  const { session, access } = guard;
  const now = new Date();

  // Marque lus uniquement les messages reçus par ce camp (pas les siens)
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

  // Reset le compteur unread du lecteur uniquement
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
      readerId: session.user.id,
      readAt: now,
      messageIds: updated.map((r) => r.id),
    });
  }

  revalidatePath("/messages");
  revalidatePath("/shelter-messages");

  return { success: true };
}

// ─── setTyping ─────────────────────────────────────────────────────────────

export async function setTyping(
  conversationId: string,
  isTyping: boolean
): Promise<ActionResponse> {
  const guard = await requireConversationAccess(conversationId);
  if ("error" in guard) return { success: false, error: guard.error };
  const { session } = guard;

  const rate = await consumeRateLimit({
    key: "messaging:typing",
    limit: 10,
    windowSec: 60,
  });
  if (!rate.ok) return { success: true }; // silencieux : ce n'est pas critique

  messagingBus.publish({
    type: "typing.changed",
    conversationId,
    userId: session.user.id,
    isTyping,
  });
  return { success: true };
}

// ─── archiveConversation ───────────────────────────────────────────────────

export async function archiveConversation(
  conversationId: string
): Promise<ActionResponse> {
  const guard = await requireConversationAccess(conversationId);
  if ("error" in guard) return { success: false, error: guard.error };
  const { access } = guard;

  if (access.asSide === "user") {
    await db
      .update(conversations)
      .set({ archivedByUser: true, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    revalidatePath("/messages");
  } else {
    await db
      .update(conversations)
      .set({ archivedByShelter: true, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    revalidatePath("/shelter-messages");
  }

  return { success: true };
}

// ─── Fanout notifications ──────────────────────────────────────────────────

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

  // Résolution des destinataires + filtre des "online SSE" — ces deux
  // opérations restent ici car elles dépendent d'état interne messaging
  // (presence bus, rôles shelter_admin). Une fois la liste finale construite,
  // on publie un event unique que le domaine notifications traite.
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

  // Nom d'affichage de l'émetteur : user.name si sender user,
  // shelter.name si sender shelter_admin.
  const { senderName, petName } = await resolveSenderAndCatName(
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

async function resolveSenderAndCatName(
  senderType: "user" | "shelter",
  senderId: string,
  conversationShelterId: string,
  conversationCatId: string | null
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
  if (conversationCatId) {
    const [c] = await db
      .select({ name: pets.name })
      .from(pets)
      .where(eq(pets.id, conversationCatId))
      .limit(1);
    if (c) petName = c.name;
  }

  return { senderName, petName };
}

async function resolveRecipients(
  senderType: "user" | "shelter",
  senderId: string,
  conversationUserId: string,
  conversationShelterId: string
): Promise<Array<{ id: string; side: "user" | "shelter" }>> {
  if (senderType === "user") {
    // Le sender est le particulier → on notifie les shelter_admins du refuge
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

  // Le sender est un shelter_admin → on notifie le particulier
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, conversationUserId))
    .limit(1);
  if (!user) return [];
  return [{ id: user.id, side: "user" as const }];
}

