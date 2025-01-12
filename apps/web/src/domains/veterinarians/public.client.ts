/**
 * Surface publique safe côté client du domaine veterinarians.
 *
 * Cf. note dans `shelters/public.client.ts` et `lost-found/public.client.ts` :
 * un barrel mixte server (queries qui importent `db` → `postgres` → `fs`)
 * + client (actions/components) traîne tout dans le bundle browser. Ce
 * fichier ne re-exporte QUE des server actions (transformées en RPC stubs
 * par Next.js) et les types nécessaires aux client components.
 *
 * Règle : tout composant `"use client"` qui appelle un server action de
 * veterinarians doit importer depuis ICI, pas depuis `./public.ts`.
 */

// ─── Server actions ────────────────────────────────────────────────────────
export {
  createVeterinarian,
  updateVeterinarian,
  updateSearchRadius,
  verifyVeterinarian,
  logReportAccess,
} from "./actions";

// ─── Validation + constantes (types/zod schemas — pas de DB) ──────────────
export {
  createVeterinarianSchema,
  updateVeterinarianSchema,
  updateSearchRadiusSchema,
  VET_SERVICE_KEYS,
  VET_SERVICE_LABELS,
  type CreateVeterinarianInput,
  type UpdateVeterinarianInput,
  type VetServiceKey,
} from "./validation";
