/**
 * API publique du domaine identity.
 * Gère : users, sessions, Better Auth, profils.
 */

// ─── Actions ────────────────────────────────────────────────────────────────
export { updateProfile, deleteAccount } from "./actions/profile";
export {
  createSavedSearch,
  deleteSavedSearch,
  toggleSavedSearch,
  toggleSavedSearchPush,
  renameSavedSearch,
} from "./actions/saved-searches";

// ─── Services (logique métier — appelés par Server Actions ET API v1) ──────
export {
  getCurrentUserProfile as getCurrentUserProfileService,
  type MeProfile,
  type UserRole,
} from "./services/me.service";
export {
  updateProfileService,
  type UpdateProfileInput,
} from "./services/profile.service";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getAdminUsersList,
  getAdminUserDetail,
  getUserRecentApplications,
  getUserRecentReports,
  getUserFollowedShelters,
} from "./queries/admin-users";
export {
  getSavedSearchesByUser,
  getSavedSearchById,
  getActiveSavedSearchesByKind,
  getPushEnabledLostFoundSearches,
  type SavedSearch,
  type SavedSearchKind,
} from "./queries/saved-searches";
export {
  describeParams,
  paramsToQueryString,
  type AdoptionSearchParams,
  type LostFoundSearchParams,
  type SavedSearchParams,
} from "./lib/saved-search-params";

// ─── Components ─────────────────────────────────────────────────────────────
export { ProfileForm } from "./components/profile-form";
export { PushToggle } from "./components/push-toggle";
export { DeleteAccountSection } from "./components/delete-account";
export { DataExportSection } from "./components/data-export";
export { TurnstileWidget } from "./components/turnstile-widget";
