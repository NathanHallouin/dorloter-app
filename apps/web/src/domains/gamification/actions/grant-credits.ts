"use server";

import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { reports, reportMatches, users } from "@/server/db/schema";
import { resolutionCredits } from "@gamification/schema";

type CreditRole = "author" | "matcher";

/**
 * Attribue les crédits de résolution pour un signalement qui vient d'être
 * marqué résolu : l'auteur + les auteurs des signalements opposés ayant une
 * correspondance confirmée (status='confirme'). La contrainte unique sur
 * (report_id, user_id, role) évite les doublons si la résolution est
 * déclenchée plusieurs fois.
 *
 * Retourne le nombre de users qui ont vu leur compteur s'incrémenter.
 */
export async function grantResolutionCredits(
  reportId: string
): Promise<number> {
  const [report] = await db
    .select({ id: reports.id, userId: reports.userId, type: reports.type })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  if (!report) return 0;

  // ─── Collecter les bénéficiaires ────────────────────────────────────────
  const credits: { userId: string; role: CreditRole }[] = [
    { userId: report.userId, role: "author" },
  ];

  // Correspondances confirmées impliquant ce signalement
  const matches = await db
    .select({
      lostReportId: reportMatches.lostReportId,
      foundReportId: reportMatches.foundReportId,
      lostUserId: sql<string>`lost_report.user_id`,
      foundUserId: sql<string>`found_report.user_id`,
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
    .where(
      and(
        eq(reportMatches.status, "confirme"),
        or(
          eq(reportMatches.lostReportId, reportId),
          eq(reportMatches.foundReportId, reportId)
        )
      )
    );

  for (const m of matches) {
    const otherUserId =
      m.lostReportId === reportId ? m.foundUserId : m.lostUserId;
    if (otherUserId && otherUserId !== report.userId) {
      credits.push({ userId: otherUserId, role: "matcher" });
    }
  }

  if (credits.length === 0) return 0;

  // ─── Insert credits (ON CONFLICT DO NOTHING via contrainte unique) ──────
  const inserted = await db
    .insert(resolutionCredits)
    .values(
      credits.map((c) => ({
        reportId,
        userId: c.userId,
        role: c.role,
      }))
    )
    .onConflictDoNothing({
      target: [
        resolutionCredits.reportId,
        resolutionCredits.userId,
        resolutionCredits.role,
      ],
    })
    .returning({ userId: resolutionCredits.userId });

  if (inserted.length === 0) return 0;

  // ─── Incrémenter le compteur sur les users crédités ─────────────────────
  const userIds = Array.from(new Set(inserted.map((r) => r.userId)));
  // Compte combien de crédits chaque user a reçu dans ce batch (évite
  // un double-increment si quelqu'un cumule 'author' + 'matcher' — edge case)
  const countByUser = new Map<string, number>();
  for (const row of inserted) {
    countByUser.set(row.userId, (countByUser.get(row.userId) ?? 0) + 1);
  }

  // Update en batch — un seul UPDATE avec CASE WHEN pour chaque user
  if (userIds.length > 0) {
    await db
      .update(users)
      .set({
        resolvedCount: sql`${users.resolvedCount} + CASE ${sql.join(
          userIds.map(
            (id) => sql`WHEN ${users.id} = ${id} THEN ${countByUser.get(id) ?? 1}`
          ),
          sql` `
        )} ELSE 0 END`,
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds));
  }

  return userIds.length;
}
