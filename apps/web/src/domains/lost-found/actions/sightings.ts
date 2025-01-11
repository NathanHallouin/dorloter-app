"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { reportSightings, reports } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

const createSightingSchema = z.object({
  reportId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  description: z.string().min(10, "Au moins 10 caractères").max(1000),
  observedAt: z.string().min(1, "Date d'observation requise"),
  photoUrl: z.string().url().optional(),
});

/**
 * Ajoute un sighting "Je l'ai vu ici" sur un signalement. Auth obligatoire
 * (anti-spam). N'envoie pas (encore) de notification à l'auteur du report ·
 * sera ajouté quand on aura les listeners cross-domain.
 */
export async function createSighting(
  formData: FormData
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireAuth();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createSightingSchema.safeParse({
    reportId: raw.reportId,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    address: raw.address || undefined,
    description: raw.description,
    observedAt: raw.observedAt,
    photoUrl: raw.photoUrl || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;

  // Vérifier que le signalement existe et est encore actif
  const [report] = await db
    .select({ id: reports.id, status: reports.status })
    .from(reports)
    .where(eq(reports.id, data.reportId))
    .limit(1);
  if (!report) {
    return { success: false, error: "Signalement introuvable." };
  }
  if (report.status !== "actif") {
    return {
      success: false,
      error: "Ce signalement n'est plus actif, les sightings sont fermés.",
    };
  }

  const [created] = await db
    .insert(reportSightings)
    .values({
      reportId: data.reportId,
      userId: session.user.id,
      location: sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never,
      address: data.address,
      description: data.description,
      observedAt: new Date(data.observedAt),
      photoUrl: data.photoUrl,
    })
    .returning({ id: reportSightings.id });

  if (!created) {
    return { success: false, error: "Création impossible." };
  }

  logEvent(
    "sighting.created",
    { sightingId: created.id, reportId: data.reportId },
    { userId: session.user.id }
  );

  revalidatePath(`/perdus-trouves/${data.reportId}`);
  return { success: true, data: { id: created.id } };
}

/**
 * Masque un sighting (modération douce). Seul l'auteur du sighting ou du
 * signalement peut le faire (suppression non destructive, on garde la trace).
 */
export async function maskSighting(
  sightingId: string
): Promise<ActionResponse> {
  const session = await requireAuth();

  const [sighting] = await db
    .select({
      id: reportSightings.id,
      userId: reportSightings.userId,
      reportId: reportSightings.reportId,
    })
    .from(reportSightings)
    .where(eq(reportSightings.id, sightingId))
    .limit(1);
  if (!sighting) {
    return { success: false, error: "Sighting introuvable." };
  }

  // Auteur du sighting OU auteur du signalement OU platform_admin
  const isAuthor = sighting.userId === session.user.id;
  const isPlatformAdmin = session.user.role === "platform_admin";
  let isReportOwner = false;
  if (!isAuthor && !isPlatformAdmin) {
    const [report] = await db
      .select({ userId: reports.userId })
      .from(reports)
      .where(eq(reports.id, sighting.reportId))
      .limit(1);
    isReportOwner = report?.userId === session.user.id;
  }
  if (!isAuthor && !isReportOwner && !isPlatformAdmin) {
    return { success: false, error: "Action non autorisée." };
  }

  await db
    .update(reportSightings)
    .set({ status: "masque" })
    .where(and(eq(reportSightings.id, sightingId)));

  revalidatePath(`/perdus-trouves/${sighting.reportId}`);
  return { success: true };
}
