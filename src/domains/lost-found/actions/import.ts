"use server";

import { z } from "zod";
import { requireAuth } from "@infra/auth/session";
import { consumeRateLimit } from "@infra/rate-limit";
import {
  fetchPetAlertAnnonce,
  isAllowedSource,
  type ImportedReport,
} from "@lost-found/petalert-import";
import type { ActionResponse } from "@/types";

const URL_SCHEMA = z.string().url().max(500);

/**
 * Importe une annonce depuis une URL externe (PetAlert pour le moment) et
 * retourne les données extraites prêtes à préfiller le formulaire. Rate
 * limité pour éviter qu'on transforme l'app en proxy de scraping.
 *
 * L'utilisateur doit être authentifié (= son identité est tracée si quelque
 * chose abuse).
 */
export async function importReportFromUrl(
  rawUrl: string
): Promise<ActionResponse<ImportedReport>> {
  await requireAuth();

  const parsed = URL_SCHEMA.safeParse(rawUrl);
  if (!parsed.success) {
    return { success: false, error: "URL invalide." };
  }

  if (!isAllowedSource(parsed.data)) {
    return {
      success: false,
      error:
        "Source non supportée. Pour l'instant, seules les URLs PetAlert sont acceptées.",
    };
  }

  const rate = await consumeRateLimit({
    key: "report:import",
    limit: 10,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Trop d'imports récents. Réessayez dans ${Math.ceil(rate.retryAfter / 60)} min.`,
    };
  }

  try {
    const data = await fetchPetAlertAnnonce(parsed.data);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Échec de l'import.",
    };
  }
}
