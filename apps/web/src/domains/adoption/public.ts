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
  submitTestimonial,
  getTestimonialForCat,
  getTestimonialContextForCat,
  getRecentTestimonials,
  unpublishTestimonial,
  type RecentTestimonial,
} from "./actions/testimonials";

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
