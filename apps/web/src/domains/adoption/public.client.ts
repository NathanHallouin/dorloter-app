/**
 * API publique client-safe du domaine adoption.
 *
 * Ne ré-exporte que des modules sans dépendance à postgres / drizzle / @infra/db :
 * - types-only depuis `lib/*-types.ts`
 * - server actions (Next.js transforme les "use server" en RPC côté client)
 *
 * Les queries DB restent dans `public.ts` (server-only).
 */

// ─── Types & constantes (client-safe) ───────────────────────────────────────
export {
  TRANSFER_STATUSES,
  TRANSFER_STATUS_LABELS,
  TRANSFER_STATUS_CLASSES,
  type PetTransfer,
  type PetTransferWithContext,
  type PetTransferStatus,
} from "./lib/transfer-types";

export {
  MEDICAL_EVENT_TYPES,
  MEDICAL_EVENT_LABELS,
  MEDICAL_EVENT_COLOR_CLASSES,
  type MedicalEventType,
  type MedicalEvent,
} from "./lib/medical-event-types";

export type { FollowupRow } from "./lib/followup-types";

export {
  parseCSV,
  suggestMapping,
  normalizeValue,
  PET_FIELDS,
  PET_FIELD_LABELS,
  type PetField,
} from "./lib/csv-import";

// ─── Server actions (sûres : "use server" dans le module action) ────────────
export {
  createPet,
  updatePet,
  updatePetStatus,
  addPetPhoto,
  deletePetPhoto,
  reorderPetPhotos,
  setPrimaryPetPhoto,
} from "./actions/pets";
export {
  createApplication,
  cancelApplication,
  updateApplicationStatus,
} from "./actions/applications";
export { toggleFavorite } from "./actions/favorites";
export {
  createMedicalEvent,
  updateMedicalEvent,
  deleteMedicalEvent,
  type MedicalEventInput,
} from "./actions/medical";
export {
  importPetsFromCsv,
  type ImportRow,
  type ImportReport,
} from "./actions/import";
export { sponsorPet, unsponsorPet } from "./actions/sponsorships";
export {
  initiateTransfer,
  acceptTransfer,
  declineTransfer,
  cancelTransfer,
} from "./actions/transfers";
export {
  submitTestimonial,
  unpublishTestimonial,
} from "./actions/testimonials";

// ─── Validation (Zod, client-safe) ──────────────────────────────────────────
export * from "./validation-pet";
export * from "./validation-application";
