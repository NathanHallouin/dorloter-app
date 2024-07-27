"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@infra/db";
import { reports, reportPhotos, reportMatches } from "@/server/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { requireAuth, getCurrentSession } from "@infra/auth/session";
import { reportFormSchema } from "../validation";
import { refreshMatchesForReport } from "../queries/matching";
import { publish } from "@infra/event-bus";
import type {
  ReportResolvedEvent,
  ReportMatchesDiscoveredEvent,
} from "../events";
import { consumeRateLimit } from "@infra/rate-limit";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

function daysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return reportFormSchema.safeParse({
    ...raw,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    isChipped: raw.isChipped === "on",
  });
}

export async function createReport(
  formData: FormData
): Promise<ActionResponse<{ id: string; matchCount: number }>> {
  const session = await requireAuth();

  // Anti-abus : max 5 signalements créés par IP / heure
  const rate = await consumeRateLimit({
    key: "report:create",
    limit: 5,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Trop de signalements récents. Réessayez dans ${Math.ceil(rate.retryAfter / 60)} min.`,
    };
  }

  // Honeypot : champ `_hp` caché qui doit rester vide (bots le remplissent)
  if (formData.get("_hp")) {
    return { success: false, error: "Requête rejetée." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }
  const data = parsed.data;

  // Détection de doublons : le user a déjà un signalement actif, même type,
  // description très similaire (pg_trgm > 0.6), posté dans les 30 derniers
  // jours. Anti-spam + UX : on guide l'user à résoudre l'existant plutôt
  // que d'en créer un nouveau.
  const [duplicate] = await db
    .select({
      id: reports.id,
      createdAt: reports.createdAt,
      similarity: sql<number>`similarity(${reports.description}, ${data.description})`,
    })
    .from(reports)
    .where(
      sql`${reports.userId} = ${session.user.id}
        AND ${reports.status} = 'actif'
        AND ${reports.type} = ${data.type}
        AND ${reports.createdAt} > now() - interval '30 days'
        AND similarity(${reports.description}, ${data.description}) > 0.6`
    )
    .orderBy(sql`similarity(${reports.description}, ${data.description}) DESC`)
    .limit(1);

  if (duplicate) {
    return {
      success: false,
      error: `Vous avez déjà un signalement actif très similaire (publié il y a ${daysSince(duplicate.createdAt)} jours). Résolvez ou éditez l'annonce existante plutôt que d'en créer une nouvelle.`,
    };
  }

  const [inserted] = await db
    .insert(reports)
    .values({
      userId: session.user.id,
      type: data.type,
      species: data.species,
      petName: data.petName,
      description: data.description,
      breed: data.breed,
      color: data.color,
      sex: data.sex,
      isChipped: data.isChipped,
      chipNumber: data.chipNumber,
      distinctiveSigns: data.distinctiveSigns,
      location: sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never,
      address: data.address,
      dateEvent: data.dateEvent,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      notes: data.notes,
    })
    .returning();

  const report = inserted!;

  // Photos : URLs transmises par le formulaire après upload côté client.
  // `photoBlur` est apparié par index avec `photoUrl` (chaîne vide = pas
  // de blur dispo).
  const photoUrls = formData
    .getAll("photoUrl")
    .filter((v) => typeof v === "string") as string[];
  const photoBlurs = formData
    .getAll("photoBlur")
    .filter((v) => typeof v === "string") as string[];
  if (photoUrls.length > 0) {
    await db.insert(reportPhotos).values(
      photoUrls.map((url, i) => ({
        reportId: report.id,
        url,
        blurDataUrl: photoBlurs[i] ? photoBlurs[i] : null,
        isPrimary: i === 0,
        order: i,
      }))
    );
  }

  logEvent(
    "report.created",
    { reportId: report.id, type: report.type, hasPhotos: photoUrls.length > 0 },
    { userId: session.user.id }
  );

  const candidates = await refreshMatchesForReport(report);

  // Publier l'event si matches trouvés — notifications écoute pour
  // prévenir l'auteur + les propriétaires des signalements en face.
  if (candidates.length > 0) {
    publish<ReportMatchesDiscoveredEvent>({
      type: "lost-found.matches_discovered",
      reportId: report.id,
      reportOwnerUserId: report.userId,
      reportType: report.type,
      matches: candidates.map((c) => ({
        reportId: c.report.id,
        reportOwnerUserId: c.report.userId,
        score: c.score,
        distanceMeters: c.distanceMeters,
      })),
    });
  }

  revalidatePath("/perdus-trouves");
  updateTag("reports");
  revalidatePath("/mes-signalements");

  return {
    success: true,
    data: { id: report.id, matchCount: candidates.length },
  };
}

/**
 * Édition d'un signalement existant — utilisé pour la "publication
 * progressive" : l'auteur peut enrichir sa fiche après publication.
 *
 * Champs immuables (qui invalideraient le matching ou l'identité de la
 * fiche) : type, species, dateEvent, location. On accepte tout le reste.
 *
 * Si la description ou la couleur changent, on relance le matching (il se
 * peut que de nouveaux candidats apparaissent).
 */
export async function updateReport(
  reportId: string,
  formData: FormData
): Promise<ActionResponse> {
  const session = await requireAuth();

  const [existing] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!existing || existing.userId !== session.user.id) {
    return { success: false, error: "Signalement introuvable." };
  }

  const raw = Object.fromEntries(formData.entries());
  const sexValue =
    raw.sex === "male" || raw.sex === "femelle" || raw.sex === "inconnu"
      ? (raw.sex as "male" | "femelle" | "inconnu")
      : undefined;
  const partial = {
    petName: typeof raw.petName === "string" ? raw.petName : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    breed: typeof raw.breed === "string" ? raw.breed : undefined,
    color: typeof raw.color === "string" ? raw.color : undefined,
    sex: sexValue,
    distinctiveSigns:
      typeof raw.distinctiveSigns === "string"
        ? raw.distinctiveSigns
        : undefined,
    address: typeof raw.address === "string" ? raw.address : undefined,
    contactPhone:
      typeof raw.contactPhone === "string" ? raw.contactPhone : undefined,
    contactEmail:
      typeof raw.contactEmail === "string" ? raw.contactEmail : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    isChipped: raw.isChipped === "on",
    chipNumber:
      typeof raw.chipNumber === "string" ? raw.chipNumber : undefined,
  };

  if (
    partial.description !== undefined &&
    partial.description.trim().length < 10
  ) {
    return {
      success: false,
      error: "La description doit faire au moins 10 caractères.",
    };
  }

  await db
    .update(reports)
    .set({ ...partial, updatedAt: new Date() })
    .where(eq(reports.id, reportId));

  // Photos additionnelles (URLs déjà uploadées côté client)
  const newPhotoUrls = formData
    .getAll("photoUrl")
    .filter((v) => typeof v === "string") as string[];
  const newPhotoBlurs = formData
    .getAll("photoBlur")
    .filter((v) => typeof v === "string") as string[];
  if (newPhotoUrls.length > 0) {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reportPhotos)
      .where(eq(reportPhotos.reportId, reportId));
    const startOrder = Number(countRow?.count ?? 0);
    await db.insert(reportPhotos).values(
      newPhotoUrls.map((url, i) => ({
        reportId,
        url,
        blurDataUrl: newPhotoBlurs[i] ? newPhotoBlurs[i] : null,
        isPrimary: startOrder + i === 0,
        order: startOrder + i,
      }))
    );
  }

  // Si description ou couleur ont changé, on relance le matching — peut
  // débloquer des candidats jusque-là sous le seuil.
  const descChanged =
    partial.description !== undefined &&
    partial.description !== existing.description;
  const colorChanged =
    partial.color !== undefined && partial.color !== existing.color;
  if (descChanged || colorChanged) {
    const [refreshed] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (refreshed) await refreshMatchesForReport(refreshed);
  }

  revalidatePath("/mes-signalements");
  revalidatePath(`/perdus-trouves/${reportId}`);
  revalidatePath(`/mes-signalements/${reportId}/edit`);
  updateTag("reports");

  return { success: true };
}

export async function updateReportStatus(
  reportId: string,
  status: "actif" | "resolu" | "expire"
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const [existing] = await db
    .select({ userId: reports.userId })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!existing || existing.userId !== session.user.id) {
    return { success: false, error: "Signalement introuvable." };
  }

  await db
    .update(reports)
    .set({ status, updatedAt: new Date() })
    .where(eq(reports.id, reportId));

  revalidatePath("/mes-signalements");
  revalidatePath(`/perdus-trouves/${reportId}`);
  revalidatePath("/perdus-trouves");
  updateTag("reports");

  return { success: true };
}

export async function deleteReport(
  reportId: string
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  await db
    .delete(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, session.user.id)));

  revalidatePath("/mes-signalements");
  revalidatePath("/perdus-trouves");
  updateTag("reports");

  return { success: true };
}

export async function respondToMatch(
  matchId: string,
  response: "confirme" | "rejete"
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  // Vérifier que l'utilisateur est bien à l'origine d'un des deux signalements
  const [row] = await db
    .select({
      id: reportMatches.id,
      lostUserId: sql<string>`lost_report.user_id`,
      foundUserId: sql<string>`found_report.user_id`,
      lostReportId: reportMatches.lostReportId,
      foundReportId: reportMatches.foundReportId,
    })
    .from(reportMatches)
    .innerJoin(
      sql`${reports} AS lost_report`,
      sql`lost_report.id = ${reportMatches.lostReportId}`
    )
    .innerJoin(
      sql`${reports} AS found_report`,
      sql`found_report.id = ${reportMatches.foundReportId}`
    )
    .where(eq(reportMatches.id, matchId))
    .limit(1);

  if (!row) return { success: false, error: "Correspondance introuvable." };

  if (row.lostUserId !== session.user.id && row.foundUserId !== session.user.id) {
    return { success: false, error: "Non autorisé." };
  }

  await db
    .update(reportMatches)
    .set({ status: response })
    .where(eq(reportMatches.id, matchId));

  // Si confirmé : marquer les deux reports comme résolus et émettre
  // `lost-found.report_resolved` — gamification écoute pour créditer.
  if (response === "confirme") {
    const resolvedAt = new Date();
    await db
      .update(reports)
      .set({
        status: "resolu",
        resolvedAt,
        resolvedByUserId: session.user.id,
        updatedAt: resolvedAt,
      })
      .where(
        or(
          eq(reports.id, row.lostReportId),
          eq(reports.id, row.foundReportId)
        )!
      );

    for (const reportId of [row.lostReportId, row.foundReportId]) {
      publish<ReportResolvedEvent>({
        type: "lost-found.report_resolved",
        reportId,
        resolvedByUserId: session.user.id,
        trigger: "match_confirmed",
        matchId,
        resolvedAt,
      });
    }

    logEvent(
      "report.resolved_via_match",
      { matchId, lostReportId: row.lostReportId, foundReportId: row.foundReportId },
      { userId: session.user.id }
    );
  }

  revalidatePath(`/perdus-trouves/${row.lostReportId}`);
  revalidatePath(`/perdus-trouves/${row.foundReportId}`);
  revalidatePath("/mes-signalements");
  updateTag("reports");

  return { success: true };
}

export async function addReportPhoto(
  reportId: string,
  url: string,
  isPrimary = false
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const [existing] = await db
    .select({ userId: reports.userId })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!existing || existing.userId !== session.user.id) {
    return { success: false, error: "Signalement introuvable." };
  }

  if (isPrimary) {
    await db
      .update(reportPhotos)
      .set({ isPrimary: false })
      .where(eq(reportPhotos.reportId, reportId));
  }

  await db.insert(reportPhotos).values({ reportId, url, isPrimary, order: 0 });

  revalidatePath(`/perdus-trouves/${reportId}`);
  updateTag("reports");

  return { success: true };
}
