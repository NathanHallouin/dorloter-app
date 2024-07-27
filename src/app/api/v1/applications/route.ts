/**
 * POST /api/v1/applications
 *
 * Soumet une candidature d'adoption pour l'animal `petId`. Auth requise.
 *
 * Réponses :
 *   - 201 Created : `{ data: { id } }`
 *   - 404 NOT_FOUND : pet inexistant
 *   - 422 UNPROCESSABLE : pet non disponible
 *   - 409 CONFLICT : déjà candidaté pour ce pet (avec details.applicationId)
 *   - 429 RATE_LIMITED : trop de candidatures récentes
 */

import { withApi, apiCreated } from "@infra/api";
import {
  applicationFormSchema,
  createApplicationService,
} from "@adoption/public";

export const POST = withApi(
  {
    authRequired: true,
    bodySchema: applicationFormSchema,
    rateLimit: { key: "api:applications:create", limit: 10, windowSec: 3600 },
  },
  async ({ body, session, requestId }) => {
    const result = await createApplicationService(session!.user.id, body);
    return apiCreated(result, { requestId });
  }
);
