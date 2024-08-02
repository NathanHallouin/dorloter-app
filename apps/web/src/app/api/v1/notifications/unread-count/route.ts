/**
 * GET /api/v1/notifications/unread-count
 *
 * Compteur léger pour le badge mobile (poll régulier). Auth requise.
 */

import { withApi, apiOk } from "@infra/api";
import { countUnreadNotificationsService } from "@notifications/public";

export const GET = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    const count = await countUnreadNotificationsService(session!.user.id);
    return apiOk({ count }, { requestId });
  }
);
