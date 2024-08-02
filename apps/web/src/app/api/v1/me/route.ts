/**
 * GET /api/v1/me
 *
 * Profil de l'utilisateur courant. Auth requise (cookie ou bearer).
 *
 * Sécurité : `pushSubscription` et `notificationPreferences` ne sont
 * **jamais** exposés — endpoints dédiés.
 */

import { withApi, apiOk } from "@infra/api";
import { getCurrentUserProfileService } from "@identity/public";
import { toMeDto } from "@/app/api/v1/_dtos/me";

export const GET = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    // session est garantie non-null par authRequired
    const profile = await getCurrentUserProfileService(session!.user.id);
    return apiOk(toMeDto(profile), { requestId });
  }
);
