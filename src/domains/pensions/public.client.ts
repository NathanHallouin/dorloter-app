/**
 * Surface client-safe du domaine pensions. Zéro query, zéro import DB.
 * Les server actions passées ici sont transformées en RPC stubs par
 * Next.js (elles ont `"use server"`).
 */

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
export { PensionFilters } from "./components/pension-filters";
export { PensionProfileForm } from "./components/pension-profile-form";
export { VerifyPensionButton } from "./components/verify-pension-button";
export { PensionCompareBar } from "./components/pension-compare-bar";
export { PensionCompareToggle } from "./components/pension-compare-toggle";
export {
  PensionContactButtons,
  PensionMobileCallCta,
} from "./components/pension-contact-buttons";
export { PensionReviewForm } from "./components/pension-review-form";
