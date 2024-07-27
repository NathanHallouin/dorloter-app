/**
 * POST /api/v1/reports/{id}/reveal-contact
 *
 * Révèle les coordonnées de contact (téléphone, email) d'un signalement
 * actif. Endpoint dédié pour ne PAS exposer ces valeurs dans les listes
 * ou la fiche détaillée publique (anti-scraping).
 *
 * Sécurité :
 *   - Rate-limit : 30 révélations / heure / IP (au-dessus → 429 + Retry-After)
 *   - Le service log un évènement `report.contact_revealed` (audit)
 *   - 410 Gone si le signalement n'est plus actif (résolu / expiré)
 *
 * Pas d'auth requise — un utilisateur anonyme peut contacter (cas d'usage :
 * voisin qui voit l'annonce sans avoir de compte).
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { revealReportContactService } from "@lost-found/public";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

export const POST = withApi(
  {
    paramsSchema,
    rateLimit: { key: "api:reports:reveal-contact", limit: 30, windowSec: 3600 },
  },
  async ({ params, session, requestId }) => {
    const data = await revealReportContactService(params.id, {
      userId: session?.user.id ?? null,
    });
    return apiOk(data, { requestId });
  }
);
