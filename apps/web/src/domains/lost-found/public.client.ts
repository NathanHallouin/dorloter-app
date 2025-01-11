/**
 * Surface publique safe côté client du domaine lost-found.
 *
 * Cf. note dans `shelters/public.client.ts` : un barrel mixte (server +
 * client) traîne `db` → `postgres` → `fs` dans le bundle browser. Ce
 * fichier ne re-exporte QUE des server actions (transformées en RPC
 * stubs par Next.js) et les types nécessaires aux client components.
 *
 * Règle : tout composant `"use client"` qui appelle un server action de
 * lost-found doit importer depuis ICI, pas depuis `./public.ts`.
 */

// ─── Server actions ────────────────────────────────────────────────────────
export { createSighting, maskSighting } from "./actions/sightings";
export { revealReportContact } from "./actions/contact";
export { markReportResolved } from "./actions/resolve";

// ─── Types (élidés au compile-time, mais on les expose pour la cohérence)
export type { SightingRow } from "./queries/sightings";
