"use server";

import { revalidatePath } from "next/cache";
import { db } from "@infra/db";
import {
  pensions,
  pensionContactEvents,
  pensionReviews,
} from "@/server/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@infra/auth/session";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

/**
 * Création (ou mise à jour) d'un avis sur une pension.
 *
 * - L'utilisateur doit être connecté.
 * - Un seul avis par (pension, user) — on UPSERT.
 * - `isVerified=true` si l'auteur a au moins un événement de contact pour
 *   cette pension dans les 90 derniers jours. Calculé à la création.
 * - Publication immédiate (`isPublished=true`), modération a posteriori
 *   par un admin via `setPensionReviewPublished`.
 */
export async function submitPensionReview(
  pensionId: string,
  input: { rating: number; comment: string }
): Promise<ActionResponse<{ reviewId: string; isVerified: boolean }>> {
  const session = await requireAuth();

  const parsed = reviewSchema.safeParse({
    rating: input.rating,
    comment: input.comment.trim() || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: "Note invalide." };
  }

  const [pension] = await db
    .select({ isVerified: pensions.isVerified })
    .from(pensions)
    .where(eq(pensions.id, pensionId))
    .limit(1);

  if (!pension || !pension.isVerified) {
    return { success: false, error: "Pension introuvable." };
  }

  // Le user est-il "vérifié" ? (≥ 1 contact dans les 90 derniers jours)
  const [contactRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pensionContactEvents)
    .where(
      and(
        eq(pensionContactEvents.pensionId, pensionId),
        eq(pensionContactEvents.userId, session.user.id),
        gte(
          pensionContactEvents.createdAt,
          sql<Date>`now() - interval '90 days'`
        )
      )
    );
  const isVerified = Number(contactRow?.count ?? 0) > 0;

  // UPSERT par (pension_id, user_id). On ne tient pas à versionner les avis
  // pour le MVP — un user peut ajuster sa note.
  const [row] = await db
    .insert(pensionReviews)
    .values({
      pensionId,
      userId: session.user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      isVerified,
      isPublished: true,
    })
    .onConflictDoUpdate({
      target: [pensionReviews.pensionId, pensionReviews.userId],
      set: {
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
        isVerified,
        updatedAt: new Date(),
      },
    })
    .returning({ id: pensionReviews.id });

  logEvent(
    "pension.review_submitted",
    { pensionId, rating: parsed.data.rating, isVerified },
    { userId: session.user.id }
  );

  revalidatePath("/pensions");
  // La fiche détail ne connaît pas le slug ici — revalidatePath pour le
  // path générique recouvre les caches. Si besoin plus fin, l'appelant
  // peut router.refresh() côté client.
  return { success: true, data: { reviewId: row!.id, isVerified } };
}

/**
 * Suppression d'un avis par son auteur.
 */
export async function deletePensionReview(
  reviewId: string
): Promise<ActionResponse> {
  const session = await requireAuth();

  await db
    .delete(pensionReviews)
    .where(
      and(
        eq(pensionReviews.id, reviewId),
        eq(pensionReviews.userId, session.user.id)
      )
    );

  revalidatePath("/pensions");
  return { success: true };
}
