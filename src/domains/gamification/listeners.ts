/**
 * Listeners du domaine gamification.
 *
 * Écoute les events métier d'autres domaines pour attribuer automatiquement
 * les crédits de résolution. Aucune dépendance inverse : lost-found ne sait
 * pas qu'on existe, il publie juste ses faits.
 */

import { subscribe } from "@infra/event-bus";
import type { ReportResolvedEvent } from "@lost-found/events";
import { grantResolutionCredits } from "./actions/grant-credits";

subscribe<ReportResolvedEvent>(
  "lost-found.report_resolved",
  async (event) => {
    await grantResolutionCredits(event.reportId);
  }
);
