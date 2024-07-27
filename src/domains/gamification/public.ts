/**
 * API publique du domaine gamification.
 *
 * Phase 3 : ce domaine basculera en listener d'events (ReportResolved,
 * MatchConfirmed) plutôt qu'en appels directs.
 */

// ─── Actions ────────────────────────────────────────────────────────────────
export { grantResolutionCredits } from "./actions/grant-credits";

// ─── Badges (paliers + jalons) ──────────────────────────────────────────────
export {
  TIERS,
  MILESTONE_BADGES,
  getBadgeTier,
  resolvedLabel,
  type BadgeTier,
  type TierConfig,
  type MilestoneBadge,
  type MilestoneConfig,
} from "./badges";

// ─── Queries ────────────────────────────────────────────────────────────────
export {
  getUserEngagementStats,
  getUserBadges,
  deriveUserBadges,
  type UserEngagementStats,
} from "./queries";

// ─── Components ─────────────────────────────────────────────────────────────
export { UserBadge } from "./components/user-badge";
export { UserBadgesGrid } from "./components/user-badges-grid";
