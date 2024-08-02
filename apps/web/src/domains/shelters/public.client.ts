/**
 * Surface publique safe côté client du domaine shelters.
 *
 * Next.js + Turbopack ne tree-shakent pas aggressivement les barrels :
 * si un client component importe depuis `./public.ts`, TOUT le module est
 * parcouru, y compris les queries qui tirent `db` → `postgres` → `fs`
 * (crash côté browser). Ce fichier-ci ne re-exporte QUE des server actions
 * (marquées `"use server"` → transformées en RPC stubs par Next.js) et des
 * composants `"use client"`. Zéro query, zéro import DB direct.
 *
 * Règle : si un composant marqué `"use client"` d'un AUTRE domaine a besoin
 * d'appeler un server action du domaine shelters, il doit importer depuis
 * ce fichier, pas depuis `./public.ts`.
 */

export {
  createShelter,
  updateShelter,
  verifyShelter,
} from "./actions";
export { toggleFollowShelter } from "./actions/follow";
export {
  inviteShelterAdmin,
  revokeShelterInvitation,
  acceptShelterInvitation,
} from "./actions/invitations";

// Composants "use client" — eux-mêmes safe à bundler côté client.
export { ShelterProfileForm } from "./components/shelter-profile-form";
export { FollowButton } from "./components/follow-button";
export { AdminsSection } from "./components/admins-section";
export { AcceptInvitation } from "./components/accept-invitation";
