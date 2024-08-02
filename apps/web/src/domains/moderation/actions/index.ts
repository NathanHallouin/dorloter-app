"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, adminDb } from "@infra/db";
import {
  pets,
  contentReports,
  reports,
  shelters,
} from "@/server/db/schema";
import {
  requireAuth,
  requirePlatformAdmin,
} from "@infra/auth/session";
import { getReportsForContent as getReportsForContentQuery } from "@moderation/queries";
import { consumeRateLimit } from "@infra/rate-limit";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

/**
 * Accès aux détails des signalements depuis un Client Component, via Server
 * Action. Restreint à platform_admin.
 */
export async function getContentReportsDetails(
  contentType: "pet" | "report" | "shelter" | "user",
  contentId: string
) {
  await requirePlatformAdmin();
  return getReportsForContentQuery(contentType, contentId);
}

/** Nombre de signalements distincts avant masquage auto. */
const AUTO_HIDE_THRESHOLD = 5;

const REPORT_SCHEMA = z.object({
  contentType: z.enum(["pet", "report", "shelter", "user"]),
  contentId: z.string().uuid(),
  reason: z.string().min(1).max(100),
  comment: z.string().max(500).optional(),
});

/**
 * Permet à un utilisateur connecté de signaler un contenu abusif.
 * Un même user ne peut signaler qu'une fois le même contenu.
 * Au-delà de AUTO_HIDE_THRESHOLD signalements distincts, le contenu est
 * masqué automatiquement (pets.status = retire, reports.status = expire,
 * shelters: pas de masquage auto — un refuge peut pas être retiré sans
 * validation humaine).
 */
export async function reportContent(
  input: z.infer<typeof REPORT_SCHEMA>
): Promise<ActionResponse> {
  const session = await requireAuth();

  const rate = await consumeRateLimit({
    key: "moderation:report",
    limit: 20,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Trop de signalements récents. Réessayez plus tard.`,
    };
  }

  const parsed = REPORT_SCHEMA.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }
  const { contentType, contentId, reason, comment } = parsed.data;

  // Déjà signalé par ce user ?
  const [existing] = await db
    .select({ id: contentReports.id })
    .from(contentReports)
    .where(
      and(
        eq(contentReports.reporterId, session.user.id),
        eq(contentReports.contentType, contentType),
        eq(contentReports.contentId, contentId)
      )
    )
    .limit(1);

  if (existing) {
    return { success: false, error: "Vous avez déjà signalé ce contenu." };
  }

  await db.insert(contentReports).values({
    reporterId: session.user.id,
    contentType,
    contentId,
    reason,
    comment: comment ?? null,
  });

  // Compte les signalements distincts pour auto-masquage
  const [row] = await db
    .select({ count: sql<number>`count(distinct reporter_id)` })
    .from(contentReports)
    .where(
      and(
        eq(contentReports.contentType, contentType),
        eq(contentReports.contentId, contentId),
        eq(contentReports.status, "en_attente")
      )
    );
  const distinctReports = Number(row?.count ?? 0);

  if (distinctReports >= AUTO_HIDE_THRESHOLD) {
    if (contentType === "pet") {
      await db
        .update(pets)
        .set({ status: "retire", updatedAt: new Date() })
        .where(eq(pets.id, contentId));
    } else if (contentType === "report") {
      await db
        .update(reports)
        .set({ status: "expire", updatedAt: new Date() })
        .where(eq(reports.id, contentId));
    }
    // Les signalements contre refuges / users restent en file de modération
    // humaine (pas de masquage auto).
  }

  logEvent(
    "moderation.content_reported",
    { contentType, contentId, reason },
    { userId: session.user.id }
  );

  revalidatePath("/admin/moderation");

  return { success: true };
}

export async function resolveContentReport(
  reportIds: string[],
  action: "masque" | "rejete"
): Promise<ActionResponse> {
  const session = await requirePlatformAdmin();
  if (reportIds.length === 0) return { success: false, error: "Aucun signalement." };

  // Fetch à modérer pour actionner le contenu si "masque"
  const rows = await db
    .select()
    .from(contentReports)
    .where(
      sql`${contentReports.id} = ANY(ARRAY[${sql.join(
        reportIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )}])`
    );

  if (action === "masque") {
    // Groupe par contenu pour éviter les updates redondants
    const contents = new Map<string, string>();
    for (const r of rows) {
      contents.set(`${r.contentType}:${r.contentId}`, r.contentType);
    }
    for (const key of contents.keys()) {
      const [type, id] = key.split(":") as [string, string];
      if (type === "pet") {
        await adminDb
          .update(pets)
          .set({ status: "retire", updatedAt: new Date() })
          .where(eq(pets.id, id));
      } else if (type === "report") {
        await adminDb
          .update(reports)
          .set({ status: "expire", updatedAt: new Date() })
          .where(eq(reports.id, id));
      } else if (type === "shelter") {
        // Rétrograde le refuge : non vérifié (privilège admin uniquement)
        await adminDb
          .update(shelters)
          .set({ isVerified: false, updatedAt: new Date() })
          .where(eq(shelters.id, id));
      }
    }
  }

  await adminDb
    .update(contentReports)
    .set({
      status: action,
      resolvedById: session.user.id,
      resolvedAt: new Date(),
    })
    .where(
      sql`${contentReports.id} = ANY(ARRAY[${sql.join(
        reportIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )}])`
    );

  logEvent(
    "moderation.resolved",
    { reportIds, action, count: reportIds.length },
    { level: "warn", userId: session.user.id }
  );

  revalidatePath("/admin/moderation");

  return { success: true };
}
