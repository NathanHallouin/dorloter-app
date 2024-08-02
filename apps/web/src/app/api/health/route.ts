import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { db } from "@infra/db";
import { s3 } from "@infra/storage/s3";

/**
 * Healthcheck pour monitoring externe (UptimeRobot, Pingdom, healthchecks.io…).
 * Vérifie :
 *  - Postgres (SELECT 1 avec timeout 2s)
 *  - S3 / MinIO (HeadBucket)
 *
 * Retourne 200 si tout est OK, 503 si au moins un service est KO.
 * Le corps détaille chaque service pour diagnostic.
 *
 * Endpoint public (pas de CRON_SECRET) — UptimeRobot en gratuit ne
 * supporte pas les headers custom. Les infos exposées sont anodines.
 */

export const dynamic = "force-dynamic"; // pas de cache

const BUCKET = process.env.S3_BUCKET!;

type ServiceState = {
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
};

async function checkDb(): Promise<ServiceState> {
  const start = performance.now();
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);
    return { status: "ok", latencyMs: Math.round(performance.now() - start) };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : "erreur inconnue",
    };
  }
}

async function checkS3(): Promise<ServiceState> {
  const start = performance.now();
  try {
    await Promise.race([
      s3.send(new HeadBucketCommand({ Bucket: BUCKET })),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);
    return { status: "ok", latencyMs: Math.round(performance.now() - start) };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : "erreur inconnue",
    };
  }
}

export async function GET() {
  const globalStart = performance.now();
  const [database, storage] = await Promise.all([checkDb(), checkS3()]);

  const overallOk = database.status === "ok" && storage.status === "ok";

  return NextResponse.json(
    {
      status: overallOk ? "ok" : "error",
      services: {
        database,
        storage,
      },
      totalLatencyMs: Math.round(performance.now() - globalStart),
      at: new Date().toISOString(),
    },
    { status: overallOk ? 200 : 503 }
  );
}
