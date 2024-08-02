import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterInvitations, users } from "@/server/db/schema";

export async function getShelterAdmins(shelterId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(
      and(eq(users.shelterId, shelterId), eq(users.role, "shelter_admin"))
    )
    .orderBy(users.name);
}

export async function getPendingInvitations(shelterId: string) {
  return db
    .select()
    .from(shelterInvitations)
    .where(
      and(
        eq(shelterInvitations.shelterId, shelterId),
        eq(shelterInvitations.status, "en_attente"),
        gt(shelterInvitations.expiresAt, sql`NOW()`)
      )
    )
    .orderBy(desc(shelterInvitations.createdAt));
}
