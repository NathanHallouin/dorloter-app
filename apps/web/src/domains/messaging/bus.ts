import { EventEmitter } from "node:events";
import type { MessageAttachmentMeta } from "./schema";

/**
 * Event bus in-process pour la messagerie temps réel.
 * Les server actions publient ; les streams SSE et les online-presence
 * trackers s'abonnent par conversationId.
 *
 * Single-process only. Pour scaler horizontalement : remplacer par Redis
 * pub/sub avec la même API (cf. docs/MESSAGING.md § Scalabilité).
 */

export type ReactionAgg = {
  emoji: string;
  count: number;
  userIds: string[];
};

export type MessageAttachment = {
  type: "gif" | "voice";
  url: string;
  meta: MessageAttachmentMeta;
};

export type MessageDTO = {
  id: string;
  conversationId: string;
  senderType: "user" | "shelter";
  senderId: string | null;
  /** Texte du message — peut être null si le message est un GIF/vocal pur. */
  content: string | null;
  attachment: MessageAttachment | null;
  readAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
  reactions: ReactionAgg[];
};

export type MessagingEvent =
  | { type: "message.created"; conversationId: string; message: MessageDTO }
  | { type: "message.updated"; conversationId: string; message: MessageDTO }
  | {
      type: "reaction.toggled";
      conversationId: string;
      messageId: string;
      reactions: ReactionAgg[];
    }
  | {
      type: "conversation.read";
      conversationId: string;
      readerId: string;
      readAt: Date;
      messageIds: string[];
    }
  | {
      type: "typing.changed";
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }
  | {
      type: "presence.changed";
      conversationId: string;
      userId: string;
      online: boolean;
    };

class MessagingBus extends EventEmitter {
  private readonly presence = new Map<string, Set<string>>(); // convId -> Set(userId)

  publish(event: MessagingEvent) {
    this.emit(`conv:${event.conversationId}`, event);
  }

  subscribe(
    conversationId: string,
    handler: (ev: MessagingEvent) => void
  ): () => void {
    const key = `conv:${conversationId}`;
    this.on(key, handler);
    return () => this.off(key, handler);
  }

  /**
   * Track une connexion SSE active d'un user sur une conversation.
   * Retourne un cleanup à appeler à la déconnexion.
   */
  trackPresence(conversationId: string, userId: string): () => void {
    let set = this.presence.get(conversationId);
    const isFirst = !set || !set.has(userId);
    if (!set) {
      set = new Set();
      this.presence.set(conversationId, set);
    }
    set.add(userId);
    if (isFirst) {
      this.publish({
        type: "presence.changed",
        conversationId,
        userId,
        online: true,
      });
    }

    return () => {
      const current = this.presence.get(conversationId);
      if (!current) return;
      current.delete(userId);
      if (current.size === 0) this.presence.delete(conversationId);
      this.publish({
        type: "presence.changed",
        conversationId,
        userId,
        online: false,
      });
    };
  }

  /** Vrai si l'user a au moins un stream SSE actif sur cette conversation. */
  isOnline(conversationId: string, userId: string): boolean {
    return this.presence.get(conversationId)?.has(userId) ?? false;
  }
}

// Singleton par process — on passe par globalThis pour survivre aux
// rechargements Turbopack en dev (sinon chaque HMR crée un nouveau bus et
// les listeners SSE précédents pointent sur un bus mort).
const globalAny = globalThis as unknown as { __messagingBus?: MessagingBus };
function ensureBus(): MessagingBus {
  if (!globalAny.__messagingBus) {
    const bus = new MessagingBus();
    bus.setMaxListeners(10_000);
    globalAny.__messagingBus = bus;
  }
  return globalAny.__messagingBus;
}
export const messagingBus = ensureBus();
