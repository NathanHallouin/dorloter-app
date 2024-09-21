/**
 * GET   /api/v1/me  — profil de l'utilisateur courant
 * PATCH /api/v1/me  — édition partielle (mobile profil edit)
 *
 * Sécurité : `pushSubscription` et `notificationPreferences` ne sont
 * **jamais** exposés/modifiables ici — endpoints dédiés.
 *
 * PATCH : tous les champs sont optionnels. Pour modifier la location,
 * envoyer `latitude` ET `longitude` ensemble (sinon validation error).
 * Pour effacer le téléphone, envoyer `phone: null`.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import {
  getCurrentUserProfileService,
  updateProfileService,
} from "@identity/public";
import { toMeDto } from "@/app/api/v1/_dtos/me";

export const GET = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    const profile = await getCurrentUserProfileService(session!.user.id);
    return apiOk(toMeDto(profile), { requestId });
  }
);

const patchBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notificationRadiusKm: z.number().int().min(1).max(50).optional(),
});

export const PATCH = withApi(
  { authRequired: true, bodySchema: patchBodySchema },
  async ({ body, session, requestId }) => {
    await updateProfileService(session!.user.id, body);
    const profile = await getCurrentUserProfileService(session!.user.id);
    return apiOk(toMeDto(profile), { requestId });
  }
);
