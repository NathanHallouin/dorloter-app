/**
 * DTO me — profil de l'utilisateur courant.
 *
 * Utilisé par `GET /api/v1/me`. Pas de `pushSubscription`,
 * pas de `notificationPreferences` (endpoints dédiés).
 */

import type { MeProfile } from "@identity/public";

export interface MeDto {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  role:
    | "user"
    | "shelter_admin"
    | "pension_admin"
    | "veterinarian_admin"
    | "platform_admin";
  /** Si l'user gère un refuge · utile pour afficher l'onglet admin. */
  shelterId: string | null;
  /** Si l'user gère une pension. */
  pensionId: string | null;
  /** Si l'user gère un cabinet vétérinaire. */
  vetId: string | null;
  phone: string | null;
  location: { latitude: number; longitude: number } | null;
  notificationRadiusKm: number | null;
  resolvedCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toMeDto(profile: MeProfile): MeDto {
  return {
    id: profile.id,
    email: profile.email,
    emailVerified: profile.emailVerified,
    name: profile.name,
    image: profile.image,
    role: profile.role,
    shelterId: profile.shelterId,
    pensionId: profile.pensionId,
    vetId: profile.vetId,
    phone: profile.phone,
    location: profile.location,
    notificationRadiusKm: profile.notificationRadiusKm,
    resolvedCount: profile.resolvedCount,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
