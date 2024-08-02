import { NextResponse } from "next/server";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@infra/db";
import { reports } from "@/server/db/schema";
import { publish } from "@infra/event-bus";
import type { ReportStaleEvent } from "@lost-found/events";
import { checkCronAuth } from "@infra/cron/auth";

/**
 * Relance l'auteur d'un signalement actif depuis 7 jours (fenêtre [7j ; 8j])
 * pour l'inciter à agir : ajouter des photos, partager, clôturer si le chat
 * a été retrouvé hors plateforme.
 *
 * Fenêtre d'un jour pour idempotency : si le cron tourne quotidiennement,
 * chaque signalement déclenche un rappel UNE fois. Si le cron rate un jour,
 * le rappel est raté pour ce batch (acceptable pour MVP — la modération
 * communautaire prend le relais via les signalements utilisateurs).
 *
 * Fréquence : quotidien, idéalement tôt le matin.
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  const stale = await db
    .select({
      id: reports.id,
      userId: reports.userId,
      type: reports.type,
      petName: reports.petName,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(
      and(
        eq(reports.status, "actif"),
        gte(reports.createdAt, eightDaysAgo),
        lt(reports.createdAt, sevenDaysAgo)
      )
    );

  for (const r of stale) {
    const daysActive = Math.floor(
      (now.getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    publish<ReportStaleEvent>({
      type: "lost-found.report_stale",
      reportId: r.id,
      reportOwnerUserId: r.userId,
      reportType: r.type,
      petName: r.petName,
      daysActive,
    });
  }

  return NextResponse.json({
    remindersTriggered: stale.length,
    at: now.toISOString(),
    query: {
      from: eightDaysAgo.toISOString(),
      to: sevenDaysAgo.toISOString(),
    },
  });
}
