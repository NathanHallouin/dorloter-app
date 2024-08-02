"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { reports } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { logEvent } from "@infra/logger";
import { publish } from "@infra/event-bus";
import type { ReportResolvedEvent } from "../events";
import type { ActionResponse } from "@/types";

/**
 * Marque un signalement comme résolu à la main (cas où le chat a été
 * retrouvé sans passer par un match Dorloter, ex. retrouvé dans le voisinage).
 * Visible côté UI uniquement pour l'auteur.
 *
 * Publie `lost-found.report_resolved` — gamification écoute pour attribuer
 * les crédits de résolution. Le compteur de contributeurs crédités n'est
 * donc plus retourné à l'UI (l'event est async) ; on affiche un message
 * de succès générique.
 */
export async function markReportResolved(
  reportId: string
): Promise<ActionResponse> {
  const session = await requireAuth();

  const [existing] = await db
    .select({
      userId: reports.userId,
      status: reports.status,
    })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!existing) {
    return { success: false, error: "Signalement introuvable." };
  }
  if (existing.userId !== session.user.id) {
    return { success: false, error: "Non autorisé." };
  }
  if (existing.status === "resolu") {
    return { success: false, error: "Ce signalement est déjà résolu." };
  }

  const resolvedAt = new Date();
  await db
    .update(reports)
    .set({
      status: "resolu",
      resolvedAt,
      resolvedByUserId: session.user.id,
      updatedAt: resolvedAt,
    })
    .where(eq(reports.id, reportId));

  publish<ReportResolvedEvent>({
    type: "lost-found.report_resolved",
    reportId,
    resolvedByUserId: session.user.id,
    trigger: "manual",
    resolvedAt,
  });

  logEvent(
    "report.resolved",
    { reportId },
    { userId: session.user.id }
  );

  revalidatePath(`/perdus-trouves/${reportId}`);
  revalidatePath("/perdus-trouves");
  revalidatePath("/mes-signalements");
  revalidatePath("/profil");
  updateTag("reports");

  return { success: true };
}
