/**
 * API publique du domaine messaging.
 *
 * Règle : tout import d'un autre domaine ou de `app/` DOIT passer par ce
 * fichier. Les internals (actions/*, queries/*, schema, bus) ne sont pas
 * considérés comme stables et peuvent bouger sans préavis.
 */

// ─── Types DTO (partagés avec hooks client) ─────────────────────────────────
export type { MessageDTO, ReactionAgg, MessagingEvent } from "./bus";
export { messagingBus } from "./bus";

// ─── Server actions ─────────────────────────────────────────────────────────
export {
  openConversation,
  sendMessage,
  editMessage,
  toggleReaction,
  markConversationRead,
  setTyping,
  archiveConversation,
} from "./actions";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  canAccessConversation,
  getMessagesForConversation,
  getMessagesSince,
  getInboxForUser,
  getInboxForShelter,
  getShelterUnreadCount,
  getConversationContext,
  getUnreadCounts,
} from "./queries";

// ─── Services (auth-agnostic, callable from API routes) ────────────────────
export {
  openConversationService,
  sendMessageService,
  markConversationReadService,
  listInboxService,
  getMessagesService,
  getConversationContextService,
  getUnreadCountService,
  editMessageService,
  toggleReactionService,
  archiveConversationService,
  setTypingService,
  getTypingService,
} from "./services/messaging.service";
export type { MessagingUserContext } from "./services/messaging.service";

// ─── Constants (UI safe — émoji whitelist) ─────────────────────────────────
export { ALLOWED_EMOJIS, isAllowedEmoji } from "./emojis";
export type { AllowedEmoji } from "./emojis";

// ─── Components ─────────────────────────────────────────────────────────────
export { MessagesNavLink } from "./components/messages-nav-link";
export { ContactShelterButton } from "./components/contact-shelter-button";
export { InboxList } from "./components/inbox-list";
export { ConversationThread } from "./components/conversation-thread";

// ─── Hooks ──────────────────────────────────────────────────────────────────
export { useMessagingStream } from "./hooks/use-messaging-stream";
