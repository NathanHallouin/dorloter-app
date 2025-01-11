/**
 * Service identity — profil de l'utilisateur courant.
 *
 * Voir docs/SERVICES-API.md pour la convention.
 *
 * Sécurité : on n'expose **jamais** `pushSubscription` (contient les
 * endpoints VAPID) ni `notificationPreferences` (endpoint dédié).
 */

import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { notFound } from "@infra/api/errors";
import { users } from "@/server/db/schema";

export type UserRole =
  | "user"
  | "shelter_admin"
  | "pension_admin"
  | "veterinarian_admin"
  | "platform_admin";

export interface MeProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  role: UserRole;
  shelterId: string | null;
  pensionId: string | null;
  vetId: string | null;
  phone: string | null;
  location: { latitude: number; longitude: number } | null;
  notificationRadiusKm: number | null;
  resolvedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Récupère le profil complet de l'utilisateur identifié par `userId`.
 *
 * Throws `notFound` si l'utilisateur n'existe pas (cas rare : session
 * orpheline après suppression de compte).
 */
export async function getCurrentUserProfile(
  userId: string
): Promise<MeProfile> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      name: users.name,
      image: users.image,
      role: users.role,
      shelterId: users.shelterId,
      pensionId: users.pensionId,
      vetId: users.vetId,
      phone: users.phone,
      location: users.location,
      notificationRadiusKm: users.notificationRadiusKm,
      resolvedCount: users.resolvedCount,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    throw notFound("Utilisateur", userId);
  }

  return {
    id: row.id,
    email: row.email,
    emailVerified: row.emailVerified,
    name: row.name,
    image: row.image,
    role: row.role,
    shelterId: row.shelterId,
    pensionId: row.pensionId,
    vetId: row.vetId,
    phone: row.phone,
    location: row.location
      ? { latitude: row.location.y, longitude: row.location.x }
      : null,
    notificationRadiusKm: row.notificationRadiusKm,
    resolvedCount: row.resolvedCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
