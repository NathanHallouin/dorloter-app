import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@infra/db";
import { reports } from "@/server/db/schema";

/**
 * Passe en statut `expire` les signalements `actif` dont `date_event` est
 * antérieur à 60 jours. Pensé pour être appelé par un cron externe (Vercel
 * Cron, GitHub Actions, UptimeRobot HTTP monitor…) une fois par jour.
 *
 * Sécurité : token requis via `?token=xxx` ou header `authorization: Bearer xxx`.
 * Sans `CRON_SECRET` défini, l'endpoint est ouvert (dev local).
 *
 * Exemple Vercel Cron (dans `vercel.json`) :
 *   { "crons": [{ "path": "/api/cron/expire-reports", "schedule": "0 3 * * *" }] }
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(request.url);
    const token =
      url.searchParams.get("token") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";
    if (token !== secret) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const result = await db
    .update(reports)
    .set({ status: "expire", updatedAt: new Date() })
    .where(
      sql`status = 'actif' AND date_event < (CURRENT_DATE - INTERVAL '60 days')`
    )
    .returning({ id: reports.id });

  return NextResponse.json({
    expiredCount: result.length,
    at: new Date().toISOString(),
  });
}
