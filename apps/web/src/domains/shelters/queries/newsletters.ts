import { desc, eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterFollows, shelterNewsletters } from "@/server/db/schema";
import type { ShelterNewsletter, ShelterNewsletterKind } from "../lib/newsletter-types";

function castRow(
  row: typeof shelterNewsletters.$inferSelect
): ShelterNewsletter {
  return {
    id: row.id,
    shelterId: row.shelterId,
    sentByUserId: row.sentByUserId,
    kind: row.kind as ShelterNewsletterKind,
    subject: row.subject,
    body: row.body,
    recipientCount: row.recipientCount,
    sentAt: row.sentAt,
  };
}

/**
 * Historique des newsletters d'un refuge, du plus récent au plus ancien.
 */
export async function getNewslettersForShelter(
  shelterId: string
): Promise<ShelterNewsletter[]> {
  const rows = await db
    .select()
    .from(shelterNewsletters)
    .where(eq(shelterNewsletters.shelterId, shelterId))
    .orderBy(desc(shelterNewsletters.sentAt));
  return rows.map(castRow);
}

/**
 * Compteur de followers d'un refuge — utilisé sur le compose pour
 * afficher « X destinataires ».
 */
export async function countFollowersForShelter(
  shelterId: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shelterFollows)
    .where(eq(shelterFollows.shelterId, shelterId));
  return Number(row?.count ?? 0);
}
