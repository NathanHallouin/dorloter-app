import { NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { db } from "@infra/db";
import { sessions } from "@/server/db/schema";
import { checkCronAuth } from "@infra/cron/auth";

/**
 * Supprime les sessions Better Auth dont `expires_at` est dépassé. Tournant
 * sous des centaines de milliers de sessions, la table peut gonfler si on
 * ne purge jamais. Idempotent. À lancer quotidiennement.
 *
 * Exemple Vercel Cron (vercel.json) :
 *   { "path": "/api/cron/purge-expired-sessions", "schedule": "0 4 * * *" }
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  return NextResponse.json({
    purgedCount: result.length,
    at: new Date().toISOString(),
  });
}
