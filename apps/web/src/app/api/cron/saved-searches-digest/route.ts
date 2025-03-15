import { NextResponse } from "next/server";
import { and, desc, eq, gt, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  petPhotos,
  pets,
  reportPhotos,
  reports,
  savedSearches,
  shelters,
  users,
} from "@/server/db/schema";
import { checkCronAuth } from "@infra/cron/auth";
import { sendEmail, savedSearchDigestEmailTemplate } from "@infra/email";
import type { SQL } from "drizzle-orm";

const MAX_ITEMS_PER_SEARCH = 6;

/**
 * Cron quotidien : pour chaque recherche sauvegardée active, scanne les
 * nouvelles publications depuis `last_notified_at` (ou `created_at` si
 * jamais notifié) qui matchent les params, et envoie un email digest
 * groupé. Met à jour `last_notified_at` même si zéro match (sinon on
 * scrute un volume croissant à chaque run).
 *
 * Exemple Vercel Cron (vercel.json) :
 *   { "path": "/api/cron/saved-searches-digest", "schedule": "0 8 * * *" }
 *   → tous les jours à 8h Paris
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const now = new Date();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

  // Tous les actifs, joints à l'utilisateur (email/nom).
  const searches = await db
    .select({
      id: savedSearches.id,
      userId: savedSearches.userId,
      userEmail: users.email,
      userName: users.name,
      kind: savedSearches.kind,
      name: savedSearches.name,
      params: savedSearches.params,
      lastNotifiedAt: savedSearches.lastNotifiedAt,
      createdAt: savedSearches.createdAt,
    })
    .from(savedSearches)
    .innerJoin(users, eq(users.id, savedSearches.userId))
    .where(eq(savedSearches.isActive, true))
    .limit(500);

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const s of searches) {
    processed += 1;
    const cutoff = s.lastNotifiedAt ?? s.createdAt;
    const params = (s.params ?? {}) as Record<string, unknown>;

    try {
      const items =
        s.kind === "adoption"
          ? await findAdoptionMatches(params, cutoff)
          : await findLostFoundMatches(params, cutoff);

      if (items.length === 0) {
        await db
          .update(savedSearches)
          .set({ lastNotifiedAt: now, updatedAt: now })
          .where(eq(savedSearches.id, s.id));
        continue;
      }

      const tpl = savedSearchDigestEmailTemplate({
        userName: s.userName,
        searchName: s.name,
        kind: s.kind as "adoption" | "lost-found",
        items,
        baseUrl,
      });
      const result = await sendEmail({ to: s.userEmail, ...tpl });
      if (result.success) {
        sent += 1;
        await db
          .update(savedSearches)
          .set({ lastNotifiedAt: now, updatedAt: now })
          .where(eq(savedSearches.id, s.id));
      } else {
        skipped += 1;
        errors.push(`${s.userEmail}: ${result.error ?? "envoi échoué"}`);
      }
    } catch (err) {
      skipped += 1;
      errors.push(
        `${s.userEmail}: ${err instanceof Error ? err.message : "erreur"}`
      );
    }
  }

  return NextResponse.json({
    processed,
    sent,
    skipped,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    at: now.toISOString(),
  });
}

// ─── Matching adoption ─────────────────────────────────────────────────────

interface DigestItem {
  id: string;
  title: string;
  subtitle: string | null;
  photoUrl: string | null;
  href: string;
}

async function findAdoptionMatches(
  params: Record<string, unknown>,
  cutoff: Date
): Promise<DigestItem[]> {
  const conditions: SQL[] = [
    eq(pets.status, "disponible"),
    gt(pets.createdAt, cutoff),
  ];

  if (typeof params.species === "string") {
    conditions.push(eq(pets.species, params.species as "chat" | "chien"));
  }
  if (typeof params.sex === "string") {
    conditions.push(eq(pets.sex, params.sex as "male" | "femelle" | "inconnu"));
  }
  if (typeof params.ageCategory === "string") {
    conditions.push(
      eq(
        pets.ageCategory,
        params.ageCategory as "chaton" | "jeune" | "adulte" | "senior"
      )
    );
  }
  if (params.okWithCats === "oui") {
    conditions.push(eq(pets.okWithCats, "oui"));
  }
  if (params.okWithDogs === "oui") {
    conditions.push(eq(pets.okWithDogs, "oui"));
  }
  if (params.okWithChildren === "oui") {
    conditions.push(eq(pets.okWithChildren, "oui"));
  }
  if (typeof params.search === "string" && params.search.length > 0) {
    conditions.push(ilike(pets.name, `%${params.search}%`));
  }
  if (typeof params.breed === "string" && params.breed.length > 0) {
    conditions.push(ilike(pets.breed, `%${params.breed}%`));
  }
  if (typeof params.color === "string" && params.color.length > 0) {
    conditions.push(ilike(pets.color, `%${params.color}%`));
  }

  const rows = await db
    .select({
      id: pets.id,
      name: pets.name,
      breed: pets.breed,
      shelterId: pets.shelterId,
    })
    .from(pets)
    .where(and(...conditions))
    .orderBy(desc(pets.createdAt))
    .limit(MAX_ITEMS_PER_SEARCH);

  if (rows.length === 0) return [];

  const [photos, shelterRows] = await Promise.all([
    db
      .select({ petId: petPhotos.petId, url: petPhotos.url })
      .from(petPhotos)
      .where(
        and(
          eq(petPhotos.isPrimary, true),
          inArray(
            petPhotos.petId,
            rows.map((r) => r.id)
          )
        )
      ),
    db
      .select({ id: shelters.id, name: shelters.name })
      .from(shelters)
      .where(
        inArray(
          shelters.id,
          rows.map((r) => r.shelterId)
        )
      ),
  ]);

  const photoMap = new Map(photos.map((p) => [p.petId, p.url]));
  const shelterMap = new Map(shelterRows.map((s) => [s.id, s.name]));

  return rows.map((r) => ({
    id: r.id,
    title: r.name,
    subtitle:
      [r.breed, shelterMap.get(r.shelterId) ?? null]
        .filter(Boolean)
        .join(" · ") || null,
    photoUrl: photoMap.get(r.id) ?? null,
    href: `/adopter/${r.id}`,
  }));
}

// ─── Matching perdus / trouvés ─────────────────────────────────────────────

async function findLostFoundMatches(
  params: Record<string, unknown>,
  cutoff: Date
): Promise<DigestItem[]> {
  const conditions: SQL[] = [
    eq(reports.status, "actif"),
    gt(reports.createdAt, cutoff),
  ];

  if (params.type === "perdu" || params.type === "trouve") {
    conditions.push(eq(reports.type, params.type));
  }
  if (params.species === "chat" || params.species === "chien") {
    conditions.push(eq(reports.species, params.species));
  }
  if (params.sex === "male" || params.sex === "femelle") {
    conditions.push(eq(reports.sex, params.sex));
  }
  if (typeof params.chipped === "boolean") {
    conditions.push(eq(reports.isChipped, params.chipped));
  }
  if (typeof params.q === "string" && params.q.length > 0) {
    const term = `%${params.q}%`;
    conditions.push(
      sql`(${ilike(reports.petName, term)} OR ${ilike(reports.description, term)} OR ${ilike(reports.address, term)})`
    );
  }
  if (
    typeof params.lat === "number" &&
    typeof params.lng === "number" &&
    typeof params.radius === "number"
  ) {
    const meters = params.radius * 1000;
    conditions.push(
      sql`ST_DWithin(${reports.location}::geography, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography, ${meters})`
    );
  }

  const rows = await db
    .select({
      id: reports.id,
      type: reports.type,
      species: reports.species,
      petName: reports.petName,
      address: reports.address,
    })
    .from(reports)
    .where(and(...conditions))
    .orderBy(desc(reports.createdAt))
    .limit(MAX_ITEMS_PER_SEARCH);

  if (rows.length === 0) return [];

  const photos = await db
    .select({ reportId: reportPhotos.reportId, url: reportPhotos.url })
    .from(reportPhotos)
    .where(
      and(
        eq(reportPhotos.isPrimary, true),
        inArray(
          reportPhotos.reportId,
          rows.map((r) => r.id)
        )
      )
    );
  const photoMap = new Map(photos.map((p) => [p.reportId, p.url]));

  return rows.map((r) => {
    const speciesLabel = r.species === "chat" ? "chat" : "chien";
    const title =
      r.type === "perdu"
        ? r.petName
          ? `${r.petName} (${speciesLabel} perdu)`
          : `${speciesLabel} perdu`
        : `${speciesLabel} trouvé`;
    return {
      id: r.id,
      title,
      subtitle: r.address ?? null,
      photoUrl: photoMap.get(r.id) ?? null,
      href: `/perdus-trouves/${r.id}`,
    };
  });
}
