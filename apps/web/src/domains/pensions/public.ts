/**
 * Surface publique server-side du domaine pensions.
 *
 * Pour une consommation client-side (client component d'un autre domaine
 * qui appelle un server action pensions), passer par `./public.client.ts`
 * afin d'éviter que Turbopack tire `queries/` (accès DB) dans le bundle
 * browser.
 */

// ─── Actions ────────────────────────────────────────────────────────────────
export {
  createPension,
  updatePension,
  verifyPension,
} from "./actions";
export { recordPensionContact } from "./actions/contact";
export {
  submitPensionReview,
  deletePensionReview,
} from "./actions/reviews";

// ─── Services (logique métier — appelés par Server Actions ET API v1) ──────
export {
  listPensions as listPensionsService,
  getPensionBySlug as getPensionBySlugService,
  type PensionSummary,
  type PensionDetail,
  type PensionListResult,
  type PensionPhoto as PensionPhotoEntity,
} from "./services/pensions.service";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getPensions,
  getPensionById,
  getPensionBySlug,
  getPensionWithPhotos,
  getPensionsBySlugs,
  getPensionsNearPoint,
  getUnverifiedPensions,
  getGlobalPensionStats,
  getRatingSummariesForPensions,
  getPensionReviews,
  getReviewContext,
  PENSION_SERVICE_KEYS,
  type PensionListFilters,
  type PensionServiceKey,
  type GlobalPensionStats,
  type RatingSummary,
  type PensionReviewWithAuthor,
} from "./queries";

// ─── Validation ─────────────────────────────────────────────────────────────
export { pensionFormSchema, type PensionFormData } from "./validation";

// ─── Components ─────────────────────────────────────────────────────────────
export { PensionCard } from "./components/pension-card";
export { PensionFilters } from "./components/pension-filters";
export { PensionProfileForm } from "./components/pension-profile-form";
export { VerifyPensionButton } from "./components/verify-pension-button";
export { PensionCompareBar } from "./components/pension-compare-bar";
export { PensionCompareToggle } from "./components/pension-compare-toggle";
export {
  PensionContactButtons,
  PensionMobileCallCta,
} from "./components/pension-contact-buttons";
export { PensionReviewsSection } from "./components/pension-reviews-section";
export { PensionReviewForm } from "./components/pension-review-form";
