// Barrel global du schéma DB : re-exporte toutes les tables des domaines.
//
// Drizzle-kit a besoin d'une vue unique pour générer les migrations ; les
// server actions/queries l'utilisent pour importer n'importe quelle table
// sans se soucier du domaine propriétaire.
//
// Ce fichier n'a plus aucune déclaration locale — chaque table vit dans
// son domaine (voir src/domains/<name>/schema.ts). Les enums transverses
// (sexEnum) vivent dans src/infrastructure/db/enums.ts.

// ─── Enums ───────────────────────────────────────────────────────────────────

// Enum userRoleEnum extrait vers `src/domains/identity/schema.ts`.
export { userRoleEnum } from "@/domains/identity/schema";

// sexEnum vit dans `infrastructure/db/enums.ts` parce qu'il est utilisé
// par adoption ET lost-found de façon eager (`sex: sexEnum()` au moment
// du `pgTable({...})`). Si on le gardait ici, les domaines le trouveraient
// en TDZ au chargement de leur schema.
export { sexEnum } from "@infra/db/enums";

// Enums adoption extraits vers `src/domains/adoption/schema.ts`.
export {
  speciesEnum,
  ageCategoryEnum,
  fivFelvEnum,
  compatibilityEnum,
  petStatusEnum,
  applicationStatusEnum,
  housingTypeEnum,
} from "@/domains/adoption/schema";

// Enums lost-found extraits vers `src/domains/lost-found/schema.ts`.
export {
  reportTypeEnum,
  reportStatusEnum,
  matchStatusEnum,
} from "@/domains/lost-found/schema";

// Enums moderation extraits vers `src/domains/moderation/schema.ts` (Phase 2).
export {
  reportedContentTypeEnum,
  moderationStatusEnum,
} from "@/domains/moderation/schema";

// Enum notificationTypeEnum extrait vers `src/domains/notifications/schema.ts`.
export {
  notificationTypeEnum,
  devicePlatformEnum,
} from "@/domains/notifications/schema";

// ─── Tables identity (users + Better Auth) ─────────────────────────────────
// Extraites vers `src/domains/identity/schema.ts`. Import+réexport car
// `users` est référencé par quasi toutes les autres tables.
import {
  users,
  sessions,
  accounts,
  verifications,
} from "@/domains/identity/schema";
export { users, sessions, accounts, verifications };

// ─── Tables métier ──────────────────────────────────────────────────────────

// Tables shelters, shelterFollows, shelterInvitations extraites vers
// `src/domains/shelters/schema.ts`. On import+réexporte (plutôt qu'un
// `export { } from`) pour que les tables ci-après puissent référencer
// `shelters` via `() => shelters.id` — callbacks lazy, le cycle est sûr.
import {
  shelters,
  shelterFollows,
  shelterInvitations,
} from "@/domains/shelters/schema";
export { shelters, shelterFollows, shelterInvitations };

// Tables pensions + pension_photos extraites vers `src/domains/pensions/schema.ts`.
export {
  pensions,
  pensionPhotos,
  pensionContactEvents,
  pensionReviews,
  pensionContactActionEnum,
} from "@/domains/pensions/schema";

// Tables pets, petPhotos extraites vers `src/domains/adoption/schema.ts`.
import {
  pets,
  petPhotos,
} from "@/domains/adoption/schema";
export { pets, petPhotos };

// Tables reports, reportPhotos, reportMatches extraites vers
// `src/domains/lost-found/schema.ts`. Import+réexport pour que les tables
// en aval (applications, resolution_credits) puissent y référer.
import {
  reports,
  reportPhotos,
  reportMatches,
} from "@/domains/lost-found/schema";
export { reports, reportPhotos, reportMatches };

// Tables applications, favorites extraites vers `src/domains/adoption/schema.ts`.
export {
  applications,
  favorites,
} from "@/domains/adoption/schema";

// Table contentReports extraite vers `src/domains/moderation/schema.ts`.
export { contentReports } from "@/domains/moderation/schema";

/**
 * Gamification : credits attribués à un user quand un signalement se résout.
 * Un user peut recevoir un crédit par rôle par signalement :
 *   - 'author' : auteur du signalement résolu
 *   - 'matcher' : auteur du signalement opposé dans une correspondance confirmée
 * La contrainte unique (report_id, user_id, role) empêche le double-comptage.
 */
// Table resolutionCredits extraite vers `src/domains/gamification/schema.ts`.
export { resolutionCredits } from "@/domains/gamification/schema";

// shelterInvitations déplacée vers `src/domains/shelters/schema.ts` (ci-dessus).

// Table testimonials extraite vers `src/domains/adoption/schema.ts`.
export { testimonials } from "@/domains/adoption/schema";

// ─── Messagerie temps réel ──────────────────────────────────────────────────
// Tables extraites vers `src/domains/messaging/schema.ts` (Phase 2 du
// refactor modulaire). Re-export ici pour que le barrel global reste
// exhaustif — drizzle-kit a besoin d'une vue unique des tables pour
// générer les migrations.
export {
  conversations,
  messages,
  messageReactions,
} from "@/domains/messaging/schema";

// Table notifications extraite vers `src/domains/notifications/schema.ts`.
export { notifications, deviceTokens } from "@/domains/notifications/schema";

