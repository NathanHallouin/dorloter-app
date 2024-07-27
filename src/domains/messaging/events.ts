import type { DomainEvent } from "@infra/event-bus";

/**
 * Events publiés par le domaine messaging (hors bus temps réel SSE qui
 * reste dans `bus.ts`). Ces events sont pour la communication
 * cross-domaine — typiquement notifications push/email.
 */

export interface MessageSentEvent extends DomainEvent {
  type: "messaging.message_sent";
  conversationId: string;
  senderType: "user" | "shelter";
  senderName: string;
  preview: string;
  /** Vrai pour le tout premier message de la conversation (trigger email). */
  isFirstMessage: boolean;
  /** Nom du chat concerné si la conversation a un contexte chat, sinon null. */
  petName: string | null;
  /** Destinataires déjà filtrés (exclut ceux avec un SSE actif sur la conv). */
  recipients: Array<{
    userId: string;
    /** Côté du destinataire — user = adoptant, shelter = admin refuge. */
    side: "user" | "shelter";
  }>;
}
