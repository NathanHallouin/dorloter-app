"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { petSponsorships, pets } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import type { ActionResponse } from "@/types";

const sponsorSchema = z.object({
  petId: z.string().uuid(),
  message: z.string().trim().max(280).optional().or(z.literal("")),
});

export async function sponsorPet(
  input: unknown
): Promise<ActionResponse<{ created: boolean }>> {
  const session = await requireAuth();
  const parsed = sponsorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const { petId, message } = parsed.data;

  // Vérif que l'animal existe (pas la peine de bloquer si adopté/réservé,
  // un parrain peut continuer à suivre un animal après sa sortie).
  const [pet] = await db
    .select({ id: pets.id })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);
  if (!pet) return { success: false, error: "Animal introuvable." };

  try {
    await db
      .insert(petSponsorships)
      .values({
        petId,
        userId: session.user.id,
        message: message?.trim() || null,
      })
      .onConflictDoUpdate({
        target: [petSponsorships.petId, petSponsorships.userId],
        set: { message: message?.trim() || null },
      });
  } catch (err) {
    console.error("sponsorPet failed", err);
    return { success: false, error: "Parrainage impossible." };
  }

  revalidatePath(`/adopter/${petId}`);
  revalidatePath("/dashboard");
  return { success: true, data: { created: true } };
}

export async function unsponsorPet(
  petId: string
): Promise<ActionResponse> {
  const session = await requireAuth();
  await db
    .delete(petSponsorships)
    .where(
      and(
        eq(petSponsorships.petId, petId),
        eq(petSponsorships.userId, session.user.id)
      )
    );
  revalidatePath(`/adopter/${petId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
