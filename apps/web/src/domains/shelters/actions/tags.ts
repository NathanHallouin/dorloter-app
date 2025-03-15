"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import {
  petTagAssignments,
  pets,
  shelterTags,
} from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import { TAG_COLORS } from "../lib/tag-colors";
import type { ActionResponse } from "@/types";

const MAX_TAGS_PER_SHELTER = 10;

const tagInputSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(60),
  color: z.enum(TAG_COLORS as readonly [string, ...string[]]),
  isPublic: z.boolean().default(false),
});

export type TagInput = z.infer<typeof tagInputSchema>;

export async function createShelterTag(
  input: TagInput
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelter();
  const parsed = tagInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Tag invalide.",
    };
  }

  const existing = await db
    .select({ id: shelterTags.id })
    .from(shelterTags)
    .where(eq(shelterTags.shelterId, session.user.shelterId));
  if (existing.length >= MAX_TAGS_PER_SHELTER) {
    return {
      success: false,
      error: `Vous avez atteint la limite (${MAX_TAGS_PER_SHELTER} tags). Supprimez-en un pour en ajouter.`,
    };
  }

  try {
    const [created] = await db
      .insert(shelterTags)
      .values({
        shelterId: session.user.shelterId,
        name: parsed.data.name,
        color: parsed.data.color as never,
        isPublic: parsed.data.isPublic,
        position: existing.length,
      })
      .returning({ id: shelterTags.id });
    if (!created) {
      return { success: false, error: "Création impossible." };
    }
    revalidatePath("/shelter-parametres-tags");
    revalidatePath("/shelter-animaux");
    return { success: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return {
        success: false,
        error: "Un tag avec ce nom existe déjà.",
      };
    }
    throw err;
  }
}

export async function updateShelterTag(
  id: string,
  input: TagInput
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = tagInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Tag invalide.",
    };
  }
  try {
    await db
      .update(shelterTags)
      .set({
        name: parsed.data.name,
        color: parsed.data.color as never,
        isPublic: parsed.data.isPublic,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shelterTags.id, id),
          eq(shelterTags.shelterId, session.user.shelterId)
        )
      );
    revalidatePath("/shelter-parametres-tags");
    revalidatePath("/shelter-animaux");
    return { success: true };
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return {
        success: false,
        error: "Un autre tag a déjà ce nom.",
      };
    }
    throw err;
  }
}

export async function deleteShelterTag(id: string): Promise<ActionResponse> {
  const session = await requireShelter();
  await db
    .delete(shelterTags)
    .where(
      and(
        eq(shelterTags.id, id),
        eq(shelterTags.shelterId, session.user.shelterId)
      )
    );
  revalidatePath("/shelter-parametres-tags");
  revalidatePath("/shelter-animaux");
  return { success: true };
}

const assignSchema = z.object({
  petId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).max(MAX_TAGS_PER_SHELTER),
});

/**
 * Remplace l'ensemble des tags d'un pet par la liste fournie. Idempotent.
 * Vérifie que tous les tags appartiennent au refuge et que le pet aussi.
 */
export async function setPetTags(
  petId: string,
  tagIds: string[]
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = assignSchema.safeParse({ petId, tagIds });
  if (!parsed.success) {
    return { success: false, error: "Tags invalides." };
  }

  // Vérifier ownership du pet
  const [pet] = await db
    .select({ shelterId: pets.shelterId })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);
  if (!pet || pet.shelterId !== session.user.shelterId) {
    return { success: false, error: "Animal introuvable." };
  }

  // Vérifier ownership de tous les tags
  if (parsed.data.tagIds.length > 0) {
    const validTags = await db
      .select({ id: shelterTags.id })
      .from(shelterTags)
      .where(
        and(
          eq(shelterTags.shelterId, session.user.shelterId)
        )
      );
    const validSet = new Set(validTags.map((t) => t.id));
    for (const t of parsed.data.tagIds) {
      if (!validSet.has(t)) {
        return { success: false, error: "Tag non autorisé." };
      }
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(petTagAssignments)
      .where(eq(petTagAssignments.petId, petId));
    if (parsed.data.tagIds.length > 0) {
      await tx.insert(petTagAssignments).values(
        parsed.data.tagIds.map((tagId) => ({
          petId,
          tagId,
        }))
      );
    }
  });

  revalidatePath("/shelter-animaux");
  revalidatePath(`/shelter-animaux/${petId}/edit`);
  revalidatePath(`/adopter/${petId}`);
  return { success: true };
}
