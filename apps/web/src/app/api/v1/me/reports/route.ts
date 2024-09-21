/**
 * GET /api/v1/me/reports
 *
 * Liste paginée des signalements créés par l'utilisateur courant. Tous
 * statuts confondus par défaut (actif + resolu + expire) — le filtre
 * `status` permet de restreindre.
 *
 * Auth requise. Tri par `dateEvent DESC, id DESC` (même cursor que
 * `/reports`).
 */

import { z } from "zod";
import { withApi, apiPaginated } from "@infra/api";
import { listReportsService } from "@lost-found/public";
import { toReportSummaryDto } from "@/app/api/v1/_dtos/report";

const querySchema = z.object({
  status: z.enum(["actif", "resolu", "expire"]).optional(),
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApi(
  { authRequired: true, querySchema },
  async ({ query, session, requestId }) => {
    const { reports, nextCursor } = await listReportsService({
      filters: {
        userId: session!.user.id,
        status: query.status,
      },
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return apiPaginated(
      reports.map(toReportSummaryDto),
      { cursor: nextCursor, hasMore: nextCursor !== null },
      { requestId }
    );
  }
);
