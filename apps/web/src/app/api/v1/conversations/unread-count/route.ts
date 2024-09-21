/**
 * GET /api/v1/conversations/unread-count
 *
 * Badge agrégé : nombre total de messages non lus pour l'utilisateur courant.
 * `total` est la somme `asUser + asShelter` — utile pour le badge tab.
 * Le mobile peut polling toutes les 30s pour rafraîchir le badge.
 */

import { withApi, apiOk } from "@infra/api";
import { getUnreadCountService } from "@messaging/public";

export const GET = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    const counts = await getUnreadCountService({
      userId: session!.user.id,
      userRole: session!.user.role,
      userShelterId: session!.user.shelterId ?? null,
    });
    return apiOk(counts, { requestId });
  }
);
