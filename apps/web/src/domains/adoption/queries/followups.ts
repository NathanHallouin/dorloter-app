import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@infra/db";
import { adoptionFollowups } from "@/server/db/schema";

export interface FollowupRow {
  id: string;
  applicationId: string;
  stage: "j15" | "j90" | "j365";
  status: "pending" | "sent" | "skipped";
  dueAt: Date;
  sentAt: Date | null;
}

/**
 * Récupère les followups (J+15, J+90, J+365) pour un lot de candidatures.
 * Retourne Map<applicationId, FollowupRow[]>. Liste vide si aucune.
 */
export async function getFollowupsForApplications(
  applicationIds: string[]
): Promise<Map<string, FollowupRow[]>> {
  const map = new Map<string, FollowupRow[]>();
  if (applicationIds.length === 0) return map;

  const rows = await db
    .select({
      id: adoptionFollowups.id,
      applicationId: adoptionFollowups.applicationId,
      stage: adoptionFollowups.stage,
      status: adoptionFollowups.status,
      dueAt: adoptionFollowups.dueAt,
      sentAt: adoptionFollowups.sentAt,
    })
    .from(adoptionFollowups)
    .where(inArray(adoptionFollowups.applicationId, applicationIds))
    .orderBy(asc(adoptionFollowups.dueAt));

  for (const r of rows) {
    const list = map.get(r.applicationId) ?? [];
    list.push(r);
    map.set(r.applicationId, list);
  }
  return map;
}

/**
 * Pour une candidature unique. Tri par dueAt croissant.
 */
export async function getFollowupsForApplication(
  applicationId: string
): Promise<FollowupRow[]> {
  return db
    .select({
      id: adoptionFollowups.id,
      applicationId: adoptionFollowups.applicationId,
      stage: adoptionFollowups.stage,
      status: adoptionFollowups.status,
      dueAt: adoptionFollowups.dueAt,
      sentAt: adoptionFollowups.sentAt,
    })
    .from(adoptionFollowups)
    .where(eq(adoptionFollowups.applicationId, applicationId))
    .orderBy(asc(adoptionFollowups.dueAt));
}
