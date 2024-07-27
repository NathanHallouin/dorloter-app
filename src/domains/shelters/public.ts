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

// ─── Validation ─────────────────────────────────────────────────────────────
export { shelterFormSchema } from "./validation";

// ─── Components ─────────────────────────────────────────────────────────────
export { ShelterProfileForm } from "./components/shelter-profile-form";
export { FollowButton } from "./components/follow-button";
export { AdminsSection } from "./components/admins-section";
export { AcceptInvitation } from "./components/accept-invitation";
