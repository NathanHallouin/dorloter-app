/**
 * POST /api/v1/notifications/read-all
 *
 * Marque toutes les notifications de l'utilisateur courant comme lues.
 * Auth requise.
 */

import { withApi, apiNoContent } from "@infra/api";
import { markAllNotificationsReadService } from "@notifications/public";

export const POST = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    await markAllNotificationsReadService(session!.user.id);
    return apiNoContent({ requestId });
  }
);
