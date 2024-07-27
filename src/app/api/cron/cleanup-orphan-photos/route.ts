import { NextResponse } from "next/server";
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { isNotNull } from "drizzle-orm";
import { db } from "@infra/db";
import {
  petPhotos,
  reportPhotos,
  shelters,
  users,
} from "@/server/db/schema";
import { s3 } from "@infra/storage/s3";
import { checkCronAuth } from "@infra/cron/auth";

/**
 * Supprime les objets S3 qui ne sont plus référencés en base.
 *
 * Stratégie :
 *  1. Liste tous les objets du bucket (paginé par 1000)
 *  2. Collecte toutes les URLs utilisées : petPhotos, reportPhotos,
 *     shelters.logo_url, shelters.cover_url, users.image
 *  3. Convertit chaque URL en clé S3 via S3_PUBLIC_URL comme préfixe
 *  4. Supprime les clés S3 présentes dans le bucket mais absentes de
 *     l'ensemble référencé
 *
 * Garde-fou : on n'efface RIEN s'il y a moins de 10 clés en base (évite
 * un désastre si la DB est corrompue ou vidée par erreur).
 *
 * Fréquence recommandée : hebdomadaire.
 */

const BUCKET = process.env.S3_BUCKET!;
const PUBLIC_URL_PREFIX = process.env.S3_PUBLIC_URL ?? "";
const MIN_REFERENCED_KEYS_SAFETY = 10;

export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  // ─── Collecte des URLs référencées en base ─────────────────────────────
  const [catUrls, reportUrls, shelterLogos, shelterCovers, userImages] =
    await Promise.all([
      db.select({ url: petPhotos.url }).from(petPhotos),
      db.select({ url: reportPhotos.url }).from(reportPhotos),
      db
        .select({ url: shelters.logoUrl })
        .from(shelters)
        .where(isNotNull(shelters.logoUrl)),
      db
        .select({ url: shelters.coverUrl })
        .from(shelters)
        .where(isNotNull(shelters.coverUrl)),
      db.select({ url: users.image }).from(users).where(isNotNull(users.image)),
    ]);

  const referencedKeys = new Set<string>();
  for (const row of [
    ...catUrls,
    ...reportUrls,
    ...shelterLogos,
    ...shelterCovers,
    ...userImages,
  ]) {
    const key = urlToKey(row.url);
    if (key) referencedKeys.add(key);
  }

  if (referencedKeys.size < MIN_REFERENCED_KEYS_SAFETY) {
    return NextResponse.json(
      {
        error: `Moins de ${MIN_REFERENCED_KEYS_SAFETY} clés référencées en base — cleanup annulé par sécurité`,
        referencedCount: referencedKeys.size,
      },
      { status: 409 }
    );
  }

  // ─── Liste des objets S3, paginé ───────────────────────────────────────
  const s3Keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );
    for (const obj of result.Contents ?? []) {
      if (obj.Key) s3Keys.push(obj.Key);
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  // ─── Calcul des orphelins ──────────────────────────────────────────────
  const orphans = s3Keys.filter((key) => !referencedKeys.has(key));

  // Batch delete par 1000 (limite API S3)
  let deletedCount = 0;
  for (let i = 0; i < orphans.length; i += 1000) {
    const chunk = orphans.slice(i, i + 1000);
    if (chunk.length === 0) continue;
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
    deletedCount += chunk.length;
  }

  return NextResponse.json({
    totalS3Objects: s3Keys.length,
    referencedKeys: referencedKeys.size,
    deletedOrphans: deletedCount,
    at: new Date().toISOString(),
  });
}

/**
 * Convertit une URL publique (https://cdn.dorloter.fr/miaou-photos/pets/xyz.jpg)
 * en clé S3 (pets/xyz.jpg). Retourne null si l'URL ne matche pas notre bucket
 * (URL externe comme Unsplash).
 */
function urlToKey(url: string | null): string | null {
  if (!url) return null;
  if (!PUBLIC_URL_PREFIX) return null;
  if (!url.startsWith(PUBLIC_URL_PREFIX)) return null;
  const key = url.slice(PUBLIC_URL_PREFIX.length).replace(/^\//, "");
  return key || null;
}
