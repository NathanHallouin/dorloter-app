/**
 * API publique du domaine moderation.
 * Règle : les imports externes passent ici, pas par les internals.
 */

// ─── Server actions ─────────────────────────────────────────────────────────
export {
  getContentReportsDetails,
  reportContent,
  resolveContentReport,
} from "./actions";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getPendingModerationQueue,
  getReportsForContent,
  getUnverifiedShelters,
  getAdminPendingCounts,
  getContentReportsByUser,
  type UserContentReport,
} from "./queries";

// ─── Components ─────────────────────────────────────────────────────────────
export { ModerationRow } from "./components/moderation-row";
export { ReportContentDialog } from "./components/report-content-dialog";
export { VerifyShelterButton } from "./components/verify-shelter-button";
