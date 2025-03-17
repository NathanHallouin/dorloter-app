/**
 * Surface publique safe côté client du domaine shelters.
 *
 * Next.js + Turbopack ne tree-shakent pas aggressivement les barrels :
 * si un client component importe depuis `./public.ts`, TOUT le module est
 * parcouru, y compris les queries qui tirent `db` → `postgres` → `fs`
 * (crash côté browser). Ce fichier-ci ne re-exporte QUE des server actions
 * (marquées `"use server"` → transformées en RPC stubs par Next.js) et des
 * composants `"use client"`. Zéro query, zéro import DB direct.
 *
 * Règle : si un composant marqué `"use client"` d'un AUTRE domaine a besoin
 * d'appeler un server action du domaine shelters, il doit importer depuis
 * ce fichier, pas depuis `./public.ts`.
 */

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
export {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type TemplateInput,
} from "./actions/templates";
export {
  replaceShelterVisitSlots,
  createVisitBooking,
  updateBookingStatusAsShelter,
  cancelBookingAsUser,
} from "./actions/visits";
export {
  createShelterTag,
  updateShelterTag,
  deleteShelterTag,
  setPetTags,
  type TagInput,
} from "./actions/tags";
export {
  createShelterEvent,
  updateShelterEvent,
  deleteShelterEvent,
  type EventInput,
} from "./actions/events";
export { sendNewsletter } from "./actions/newsletters";
export {
  NEWSLETTER_KINDS,
  NEWSLETTER_LABELS,
  type ShelterNewsletter,
  type ShelterNewsletterKind,
} from "./lib/newsletter-types";
export {
  createShelterDocument,
  updateShelterDocument,
  deleteShelterDocument,
  type DocumentInput,
} from "./actions/documents";
export {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
  formatBytes,
  type ShelterDocument,
  type DocumentKind,
  type DocumentVisibility,
} from "./lib/document-types";
export {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_CLASSES,
  type ShelterEvent,
  type ShelterEventType,
} from "./lib/event-types";
export {
  TAG_COLORS,
  TAG_COLOR_CLASSES,
  TAG_COLOR_LABELS,
  type TagColor,
} from "./lib/tag-colors";
export type { ShelterTag } from "./lib/tag-types";
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
  TEMPLATE_VARIABLES,
  renderTemplate,
  buildTemplateContext,
  type TemplateContext,
} from "./lib/template-variables";

// Composants "use client" — eux-mêmes safe à bundler côté client.
export { ShelterProfileForm } from "./components/shelter-profile-form";
export { FollowButton } from "./components/follow-button";
export { AdminsSection } from "./components/admins-section";
export { AcceptInvitation } from "./components/accept-invitation";
export { TemplateSelector } from "./components/template-selector";

// Types réutilisés côté client (purement structurels, pas de runtime DB).
export type {
  ResponseTemplate,
  ResponseTemplateKind,
} from "./lib/template-types";

// ─── Bénévoles refuge (client-safe) ─────────────────────────────────────────
export {
  VOLUNTEER_STATUS_LABELS,
  VOLUNTEER_STATUS_CLASSES,
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_CLASSES,
  SHIFT_SIGNUP_STATUS_LABELS,
  signupHours,
  type Volunteer,
  type VolunteerWithUser,
  type VolunteerStatus,
  type Shift,
  type ShiftWithSignups,
  type ShiftStatus,
  type ShiftSignup,
  type ShiftSignupWithContext,
  type ShiftSignupStatus,
} from "./lib/volunteer-types";
export {
  applyAsVolunteer,
  validateVolunteer,
  rejectVolunteer,
  setVolunteerStatus,
  upsertShift,
  cancelShift,
  deleteShift,
  signUpToShift,
  cancelMySignup,
  checkInSignup,
  checkOutSignup,
  markSignupAbsent,
} from "./actions/volunteers";

// ─── Familles d'accueil (client-safe) ───────────────────────────────────────
export {
  FOSTER_FAMILY_STATUS_LABELS,
  FOSTER_FAMILY_STATUS_CLASSES,
  FOSTER_PLACEMENT_STATUS_LABELS,
  FOSTER_PLACEMENT_STATUS_CLASSES,
  type FosterFamily,
  type FosterFamilyWithUser,
  type FosterFamilyStatus,
  type FosterPlacement,
  type FosterPlacementWithContext,
  type FosterPlacementStatus,
} from "./lib/foster-family-types";
export {
  applyAsFosterFamily,
  validateFosterFamily,
  rejectFosterFamily,
  setFosterFamilyStatus,
  createFosterPlacement,
  endFosterPlacement,
  cancelFosterPlacement,
} from "./actions/foster-families";

// ─── Actualités refuge (client-safe) ────────────────────────────────────────
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
  upsertNewsPost,
  deleteNewsPost,
  archiveNewsPost,
  approveNewsPost,
  rejectNewsPost,
} from "./actions/news-posts";
