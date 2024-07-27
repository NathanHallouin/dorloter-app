import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { reports } from "@/server/db/schema";
import { refreshMatchesForReport } from "@lost-found/public";
import { checkCronAuth } from "@infra/cron/auth";

/**
 * Recalcule les correspondances perdu/trouvé pour tous les signalements
 * `actif`. Utile quand :
 *  - un signalement a été édité (coordonnées / description / couleur)
 *  - un ancien signalement matche désormais un nouveau qui vient d'arriver
 *    et qu'un refresh initial avait manqué
 *  - on veut purger les matches `suggere` obsolètes
 *
 * Coût : O(n × m) où n = reports actifs, m = candidats spatial. Pour un MVP
 * c'est largement tolérable (<1000 reports). Si ça monte, ajouter une
 * colonne `matches_refreshed_at` et ne refresh que les stale.
 *
 * Fréquence recommandée : quotidienne.
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const activeReports = await db
    .select()
    .from(reports)
    .where(eq(reports.status, "actif"));

  let totalRefreshed = 0;
  let totalMatchesCreated = 0;
  const errors: string[] = [];

  for (const report of activeReports) {
    try {
      const candidates = await refreshMatchesForReport(report);
      totalRefreshed += 1;
      totalMatchesCreated += candidates.length;
    } catch (err) {
      errors.push(
        `report ${report.id}: ${err instanceof Error ? err.message : "erreur inconnue"}`
      );
    }
  }

  return NextResponse.json({
    refreshedReports: totalRefreshed,
    matchesCreated: totalMatchesCreated,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    at: new Date().toISOString(),
  });
}
