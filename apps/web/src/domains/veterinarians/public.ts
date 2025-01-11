/**
 * API publique du domaine veterinarians.
 * Tout import externe passe par ce barrel.
 */

// ─── Actions ────────────────────────────────────────────────────────────────
export {
  createVeterinarian,
  updateVeterinarian,
  updateSearchRadius,
  verifyVeterinarian,
  logReportAccess,
} from "./actions";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getVerifiedVeterinarians,
  getVeterinarianById,
  getVeterinarianBySlug,
  getUnverifiedVeterinarians,
  getGlobalVetStats,
  getRecentReportAccess,
  type VetListFilters,
} from "./queries";

// ─── Validation + constantes ───────────────────────────────────────────────
export {
  createVeterinarianSchema,
  updateVeterinarianSchema,
  updateSearchRadiusSchema,
  VET_SERVICE_KEYS,
  VET_SERVICE_LABELS,
  type CreateVeterinarianInput,
  type UpdateVeterinarianInput,
  type VetServiceKey,
} from "./validation";
