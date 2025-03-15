/**
 * API publique du domaine adoption.
 */

// ─── Actions ────────────────────────────────────────────────────────────────
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
export {
  parseCSV,
  suggestMapping,
  normalizeValue,
  PET_FIELDS,
  PET_FIELD_LABELS,
  type PetField,
} from "./lib/csv-import";
export { PetCampaignBlock } from "./components/pet-campaign-block";
export { SponsorButton } from "./components/sponsor-button";
export {
  countSponsorsForPet,
  countSponsorsForPets,
  isSponsorOfPet,
  getSponsoredPetsForUser,
  type SponsorshipSummary,
} from "./queries/sponsorships";
export { sponsorPet, unsponsorPet } from "./actions/sponsorships";
export {
  initiateTransfer,
  acceptTransfer,
  declineTransfer,
  cancelTransfer,
} from "./actions/transfers";
export {
  getTransfersForShelter,
  getTransferById,
  getTransferHistoryForPet,
  countPendingInboundTransfers,
  listShelterTransferTargets,
} from "./queries/transfers";
export {
  TRANSFER_STATUSES,
  TRANSFER_STATUS_LABELS,
  TRANSFER_STATUS_CLASSES,
  type PetTransfer,
  type PetTransferWithContext,
  type PetTransferStatus,
} from "./lib/transfer-types";
export {
  submitTestimonial,
  getTestimonialForCat,
  getTestimonialContextForCat,
  getRecentTestimonials,
  unpublishTestimonial,
  type RecentTestimonial,
} from "./actions/testimonials";
export {
  listTestimonials,
  getSheltersWithTestimonials,
  type PublicTestimonial,
  type TestimonialFilters,
  type TestimonialListResult,
} from "./queries/testimonials";

// ─── Services (logique métier — appelés par Server Actions ET API v1) ──────
export {
  getPetWithDetails as getPetWithDetailsService,
  listPets as listPetsService,
  getSimilarPets as getSimilarPetsService,
  type PetWithDetails,
  type PetSummary,
  type PetListFilters,
  type PetListResult,
} from "./services/pets.service";
export {
  createApplication as createApplicationService,
  cancelApplication as cancelApplicationService,
  type CreateApplicationResult,
} from "./services/applications.service";
export {
  toggleFavorite as toggleFavoriteService,
  listFavoritePetIds as listFavoritePetIdsService,
  type ToggleFavoriteResult,
} from "./services/favorites.service";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getPets,
  getPetById,
  getPetWithDetails,
  getPetsByShelter,
  getSimilarPets,
  getPetPhotos,
  getPetsNearPoint,
  countPetsNearPoint,
  getSwipeablePets,
} from "./queries/pets";
export {
  getApplicationsByUser,
  getApplicationsForShelter,
  getApplicationById,
  getPrimaryPhotosForPets,
} from "./queries/applications";
export {
  type ShelterStats,
  type GlobalAdoptionStats,
  getShelterStats,
  getApplicationsCountForCat,
  getPendingApplicationsCountForPets,
  getGlobalAdoptionStats,
} from "./queries/stats";
export {
  getShelterAdvancedStats,
  type ShelterAdvancedStats,
  type HardToPlacePet,
} from "./queries/shelter-advanced-stats";
export {
  getFollowupsForApplication,
  getFollowupsForApplications,
  type FollowupRow,
} from "./queries/followups";
export {
  getMedicalEventsForPet,
  getMedicalEventById,
  getUpcomingRemindersForShelter,
} from "./queries/medical";
export {
  getAdoptedPetsForUser,
  isAdopterOfPet,
  type AdoptedPetSummary,
} from "./queries/adopted-pets";
export {
  MEDICAL_EVENT_TYPES,
  MEDICAL_EVENT_LABELS,
  MEDICAL_EVENT_COLOR_CLASSES,
  type MedicalEventType,
  type MedicalEvent,
} from "./lib/medical-event-types";
export { getUserFavorites } from "./actions/favorites";

// ─── Validation ─────────────────────────────────────────────────────────────
export * from "./validation-pet";
export * from "./validation-application";

// ─── Components ─────────────────────────────────────────────────────────────
export { PetCard } from "./components/pet-card";
export { PetFilters } from "./components/pet-filters";
export { PetForm } from "./components/pet-form";
export { PetPhotoManager } from "./components/pet-photo-manager";
export { PetShare } from "./components/pet-share";
export { PetPhotoGallery } from "./components/pet-photo-gallery";
export { PetSwipeDeck } from "./components/pet-swipe-deck";
export { MatchQuiz } from "./components/match-quiz";
export { CatalogModeToggle } from "./components/catalog-mode-toggle";
export { PetCompatibilityPills } from "./components/pet-compatibility-pills";
export { FavoriteButton } from "./components/favorite-button";
export { PetCompareToggle } from "./components/pet-compare-toggle";
export { PetCompareBar } from "./components/pet-compare-bar";
export { TestimonialDisplay } from "./components/testimonial-display";
export { TestimonialForm } from "./components/testimonial-form";
export { RecentTestimonialsSection } from "./components/recent-testimonials-section";
export { ApplicationForm } from "./components/application-form";
export { ApplicationStatusBadge } from "./components/application-status";
export { MyApplicationRow } from "./components/my-application-row";
export { ShelterApplicationRow } from "./components/shelter-application-row";
