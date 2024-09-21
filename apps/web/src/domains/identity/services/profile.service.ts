/**
 * Service profil — édition partielle des champs utilisateur.
 *
 * Auth-agnostic : prend `userId` en paramètre (pas de `requireAuth()`).
 * Utilisable depuis les routes API v1 où l'auth passe par `withApi`.
 *
 * Tous les champs sont optionnels. La location se met à null si lat/lng
 * absents ; pour la garder inchangée, ne pas envoyer ces champs.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";
import { validationFailed } from "@infra/api/errors";

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  latitude?: number;
  longitude?: number;
  notificationRadiusKm?: number;
}

export async function updateProfileService(
  userId: string,
  input: UpdateProfileInput
): Promise<{ updated: boolean }> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed.length < 1 || trimmed.length > 255) {
      throw validationFailed(
        "Le nom doit faire entre 1 et 255 caractères."
      );
    }
    patch.name = trimmed;
  }

  if (input.phone !== undefined) {
    patch.phone = input.phone ? input.phone.trim() : null;
  }

  if (input.notificationRadiusKm !== undefined) {
    if (
      !Number.isInteger(input.notificationRadiusKm) ||
      input.notificationRadiusKm < 1 ||
      input.notificationRadiusKm > 50
    ) {
      throw validationFailed(
        "Le rayon de notification doit être un entier entre 1 et 50 km."
      );
    }
    patch.notificationRadiusKm = input.notificationRadiusKm;
  }

  if (input.latitude !== undefined || input.longitude !== undefined) {
    if (input.latitude === undefined || input.longitude === undefined) {
      throw validationFailed(
        "Latitude et longitude doivent être fournies ensemble."
      );
    }
    if (input.latitude < -90 || input.latitude > 90) {
      throw validationFailed("Latitude hors bornes [-90 ; 90].");
    }
    if (input.longitude < -180 || input.longitude > 180) {
      throw validationFailed("Longitude hors bornes [-180 ; 180].");
    }
    patch.location = sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)`;
  }

  await db.update(users).set(patch).where(eq(users.id, userId));
  return { updated: true };
}
