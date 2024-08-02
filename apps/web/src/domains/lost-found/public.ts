/**
 * API publique du domaine lost-found.
 */

// ─── Actions ────────────────────────────────────────────────────────────────
export {
  createReport,
  updateReport,
  updateReportStatus,
  deleteReport,
  respondToMatch,
  addReportPhoto,
} from "./actions";
export { markReportResolved } from "./actions/resolve";
export { importReportFromUrl } from "./actions/import";
export { revealReportContact } from "./actions/contact";

// ─── Services (logique métier — appelés par Server Actions ET API v1) ──────
export {
  listReports as listReportsService,
  getReportWithDetails as getReportWithDetailsService,
  revealReportContact as revealReportContactService,
  createReport as createReportService,
  type ReportSummary,
  type ReportDetail,
  type ReportPhoto as ReportPhotoEntity,
  type ReportListFilters,
  type ReportListResult,
  type RevealedContact,
  type BoundingBox,
  type CreateReportInput,
  type CreateReportPhotoInput,
  type CreateReportResult,
} from "./services/reports.service";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getReports,
  getReportById,
  getReportWithPhotos,
  getReportsByUser,
  getPrimaryPhotosForReports,
  getGlobalReportStats,
  getRetrouvaillesStats,
  type GlobalReportStats,
  type RetrouvaillesStats,
} from "./queries";
export {
  computeMatchScore,
  computeMatchBreakdown,
  getScoreTier,
  SCORE_MAX,
  findMatchCandidates,
  refreshMatchesForReport,
  getMatchesForReport,
  updateMatchStatus,
  type MatchBreakdown,
} from "./queries/matching";

// ─── Validation ─────────────────────────────────────────────────────────────
export { reportFormSchema } from "./validation";

// ─── Components ─────────────────────────────────────────────────────────────
export { ReportCard } from "./components/report-card";
export { ReportMap } from "./components/report-map";
export { RadiusFilter } from "./components/radius-filter";
export { ReportStatusBadge } from "./components/report-status-badge";
export { ReportMatches } from "./components/report-matches";
export { ReportShare } from "./components/report-share";
export { ReportPhotoGallery } from "./components/report-photo-gallery";
export { ReportContactReveal } from "./components/report-contact-reveal";
export { ResolveReportButton } from "./components/resolve-report-button";
export { ReportForm } from "./components/report-form";
export { ReportEditForm } from "./components/report-edit-form";
export { MyReportRow } from "./components/my-report-row";
