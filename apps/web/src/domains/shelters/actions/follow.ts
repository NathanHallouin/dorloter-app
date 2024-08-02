"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterFollows } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import type { ActionResponse } from "@/types";

/**
 * Toggle follow du refuge courant pour l'user connecté.
 * Un follower recevra un `new_cat_nearby` à chaque publication d'un
 * chat par ce refuge — adoption émet `adoption.pet_published`,
 * notifications écoute (cf. `src/domains/notifications/listeners.ts`).
 */
export async function toggleFollowShelter(
  shelterId: string
): Promise<ActionResponse<{ following: boolean }>> {
  const session = await requireAuth();

  const [existing] = await db
    .select({ userId: shelterFollows.userId })
    .from(shelterFollows)
    .where(
      and(
        eq(shelterFollows.userId, session.user.id),
        eq(shelterFollows.shelterId, shelterId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .delete(shelterFollows)
      .where(
        and(
          eq(shelterFollows.userId, session.user.id),
          eq(shelterFollows.shelterId, shelterId)
        )
      );
    revalidatePath(`/refuges/${shelterId}`);
    return { success: true, data: { following: false } };
  }

  await db.insert(shelterFollows).values({
    userId: session.user.id,
    shelterId,
  });
  revalidatePath(`/refuges/${shelterId}`);
  return { success: true, data: { following: true } };
}
