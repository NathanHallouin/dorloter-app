"use server";

import { consumeRateLimit } from "@infra/rate-limit";
import { getCurrentSession } from "@infra/auth/session";
import { DomainError } from "@infra/api/errors";
import {
  revealReportContact as revealReportContactService,
  type RevealedContact,
} from "../services/reports.service";
import type { ActionResponse } from "@/types";

/**
 * Server Action — révèle les coordonnées de contact d'un signalement.
 *
 * Coquille fine : rate-limite (30/h/IP), récupère la session, délègue au
 * service la logique métier, traduit `DomainError` → `ActionResponse`.
 *
 * Anti-scraping : le HTML public ne contient jamais phone/email ; cette
 * révélation est rate-limitée et loggée par le service.
 */
export async function revealReportContact(
  reportId: string
): Promise<ActionResponse<RevealedContact>> {
  const rate = await consumeRateLimit({
    key: "report:reveal-contact",
    limit: 30,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error:
        "Trop de demandes en peu de temps. Réessayez dans quelques minutes.",
    };
  }

  const session = await getCurrentSession();

  try {
    const data = await revealReportContactService(reportId, {
      userId: session?.user.id ?? null,
    });
    return { success: true, data };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    throw err;
  }
}
