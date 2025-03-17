/**
 * API publique du domaine shelters.
 * Les imports externes DOIVENT passer ici.
 */

// ─── Server actions ─────────────────────────────────────────────────────────
export {
  createShelter,
  updateShelter,
  verifyShelter,
} from "./actions";
export { toggleFollowShelter } from "./actions/follow";
export {
  inviteShelterAdmin,
  revokeShelterInvitation,
  acceptShelterInvitation,
} from "./actions/invitations";

// ─── Services (logique métier — appelés par Server Actions ET API v1) ──────
export {
  listShelters as listSheltersService,
  getShelterBySlug as getShelterBySlugService,
  type ShelterSummary,
  type ShelterDetail,
  type ShelterListFilters,
  type ShelterListResult,
} from "./services/shelters.service";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getShelters,
  getShelterById,
  getShelterBySlug,
  getShelterPublicStats,
  isFollowingShelter,
  getSheltersWithStats,
  getSheltersNearPoint,
  getGlobalShelterStats,
  type GlobalShelterStats,
} from "./queries";
export {
  getShelterAdmins,
  getPendingInvitations,
} from "./queries/admins";
export { getShelterMapPoints } from "./queries/map-points";
export {
  getTemplatesForShelter,
  getTemplatesByKind,
  getTemplateById,
  type ResponseTemplate,
  type ResponseTemplateKind,
} from "./queries/templates";
export {
  getVisitSlotsForShelter,
  getUpcomingBookingsForShelter,
  getBookingsBetween,
  getBookingById,
  getBookingsForUser,
  getBookingsDueForReminder,
  type VisitSlot,
  type VisitBooking,
} from "./queries/visits";
export {
  computeAvailability,
  groupByDay,
  formatMinutes,
  formatRange,
  getIsoDayOfWeek,
  DAY_LABELS_ISO,
  DAY_LABELS_SHORT_ISO,
  HALF_HOURS_FROM_8_TO_19,
  type AvailabilitySlot,
} from "./lib/visit-slots";
export {
  getTagsForShelter,
  getTagsForPet,
  getTagsForPets,
  type ShelterTag,
} from "./queries/tags";
export {
  getEventsForShelter,
  getEventById,
  listPublicEvents,
  getSheltersWithUpcomingEvents,
  type PublicEventsFilters,
} from "./queries/events";
export {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_CLASSES,
  type ShelterEvent,
  type PublicEvent,
  type ShelterEventType,
} from "./lib/event-types";
export {
  getNewslettersForShelter,
  countFollowersForShelter,
} from "./queries/newsletters";
export {
  NEWSLETTER_KINDS,
  NEWSLETTER_LABELS,
  type ShelterNewsletter,
  type ShelterNewsletterKind,
} from "./lib/newsletter-types";
export {
  getDocumentsForShelter,
  getPublicDocumentsForShelter,
} from "./queries/documents";
export {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
  formatBytes,
  type ShelterDocument,
  type DocumentKind,
  type DocumentVisibility,
} from "./lib/document-types";
export {
  TAG_COLORS,
  TAG_COLOR_CLASSES,
  TAG_COLOR_LABELS,
  type TagColor,
} from "./lib/tag-colors";
export {
  TEMPLATE_VARIABLES,
  renderTemplate,
  buildTemplateContext,
  type TemplateContext,
} from "./lib/template-variables";

// ─── Actualités refuge ──────────────────────────────────────────────────────
export {
  listPublishedNewsPosts,
  getNewsPostBySlug,
  getNewsPostsForShelter,
  getNewsPostById,
  isSlugAvailable,
  getNewsPostsAwaitingModeration,
  countNewsPostsAwaitingModeration,
  getSheltersWithNewsPosts,
} from "./queries/news-posts";
export {
  upsertNewsPost,
  deleteNewsPost,
  archiveNewsPost,
  approveNewsPost,
  rejectNewsPost,
} from "./actions/news-posts";
export {
  NEWS_POST_TYPES,
  NEWS_POST_TYPE_LABELS,
  NEWS_POST_TYPE_CLASSES,
  NEWS_POST_STATUS_LABELS,
  type NewsPost,
  type NewsPostWithShelter,
  type NewsPostType,
  type NewsPostStatus,
} from "./lib/news-post-types";
export {
  renderNewsMarkdown,
  slugify as slugifyNews,
  extractExcerpt,
} from "./lib/news-markdown";

// ─── Validation ─────────────────────────────────────────────────────────────
export { shelterFormSchema } from "./validation";

// ─── Components ─────────────────────────────────────────────────────────────
export { ShelterProfileForm } from "./components/shelter-profile-form";
export { FollowButton } from "./components/follow-button";
export { AdminsSection } from "./components/admins-section";
export { AcceptInvitation } from "./components/accept-invitation";
