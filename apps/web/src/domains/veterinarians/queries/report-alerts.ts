import { asc, eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { vetReportAlerts } from "@/server/db/schema";

export interface VetReportAlertSummary {
  /** Nombre de cabinets vétos alertés. */
  count: number;
  /** Date de la première alerte (= moment du fanout pour ce signalement). */
  firstAlertedAt: Date | null;
}

/**
 * Résumé des alertes véto envoyées pour un signalement : nombre de
 * cabinets prévenus et date de la première alerte. Utilisé pour
 * afficher « X vétos alertés » dans le flux d'activité de la fiche.
 */
export async function getVetAlertSummaryForReport(
  reportId: string
): Promise<VetReportAlertSummary> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      firstAt: sql<Date | null>`min(${vetReportAlerts.sentAt})`,
    })
    .from(vetReportAlerts)
    .where(eq(vetReportAlerts.reportId, reportId));

  return {
    count: Number(row?.count ?? 0),
    firstAlertedAt: row?.firstAt ?? null,
  };
}

/**
 * Toutes les alertes pour un signalement (vetId + distance + timestamp),
 * triées par distance croissante. Utilisable pour debug ou pour afficher
 * la liste détaillée côté admin RGPD.
 */
export async function getVetAlertsForReport(reportId: string) {
  return db
    .select({
      id: vetReportAlerts.id,
      vetId: vetReportAlerts.vetId,
      distanceMeters: vetReportAlerts.distanceMeters,
      emailSent: vetReportAlerts.emailSent,
      pushSent: vetReportAlerts.pushSent,
      sentAt: vetReportAlerts.sentAt,
    })
    .from(vetReportAlerts)
    .where(eq(vetReportAlerts.reportId, reportId))
    .orderBy(asc(vetReportAlerts.distanceMeters));
}
