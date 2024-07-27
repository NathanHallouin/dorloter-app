import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@infra/db";
import { conversations } from "@/server/db/schema";
import { checkCronAuth } from "@infra/cron/auth";
import { logEvent } from "@infra/logger";

/**
 * Purge des conversations inactives depuis plus de 18 mois (RGPD — durée
 * strictement nécessaire à la finalité du service). Le DELETE cascade sur
 * `messages` et `message_reactions` via les FK `ON DELETE CASCADE`.
 *
 * Critère : `last_message_at < now() - interval '18 months'`. On ne se
 * contente pas de l'archivage (archived_by_*) car un fil oublié sans
 * archivage explicite doit aussi être purgé.
 *
 * Fréquence recommandée : mensuelle.
 * Exemple crontab : `0 3 1 * * curl https://dorloter.fr/api/cron/purge-stale-conversations?token=$CRON_SECRET`
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const result = await db
    .delete(conversations)
    .where(sql`${conversations.lastMessageAt} < now() - interval '18 months'`)
    .returning({ id: conversations.id });

  if (result.length > 0) {
    logEvent(
      "messaging.purged_stale",
      { count: result.length },
      { level: "warn" }
    );
  }

  return NextResponse.json({
    purgedCount: result.length,
    at: new Date().toISOString(),
  });
}
