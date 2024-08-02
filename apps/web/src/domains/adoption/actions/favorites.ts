"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@infra/db";
import { favorites, pets } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@infra/auth/auth";
import type { ActionResponse } from "@/types";
import { getApplicationsCountForCat } from "../queries/stats";

interface ToggleFavoriteResult {
  isFavorite: boolean;
  /** Nom de l'animal — alimente le toast contextuel côté client. */
  petName: string | null;
  /** Candidatures en cours sur ce pet (si on vient d'ajouter le favori). */
  applicationsCount: number | null;
}

export async function toggleFavorite(
  petId: string
): Promise<ActionResponse<ToggleFavoriteResult>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Non autorisé" };

  const existing = await db
    .select()
    .from(favorites)
    .where(
      and(eq(favorites.userId, session.user.id), eq(favorites.petId, petId))
    )
    .limit(1);

  if (existing[0]) {
    await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, session.user.id), eq(favorites.petId, petId))
      );
    revalidatePath("/dashboard");
    return {
      success: true,
      data: { isFavorite: false, petName: null, applicationsCount: null },
    };
  }

  await db.insert(favorites).values({
    userId: session.user.id,
    petId,
  });

  // Contexte enrichi : nom + candidatures en cours, alimente un toast
  // contextuel ("le refuge a déjà reçu N candidatures").
  const [petRow, applicationsCount] = await Promise.all([
    db
      .select({ name: pets.name })
      .from(pets)
      .where(eq(pets.id, petId))
      .limit(1),
    getApplicationsCountForCat(petId),
  ]);

  revalidatePath("/dashboard");
  return {
    success: true,
    data: {
      isFavorite: true,
      petName: petRow[0]?.name ?? null,
      applicationsCount,
    },
  };
}

export async function getUserFavorites(userId: string) {
  return db.select().from(favorites).where(eq(favorites.userId, userId));
}
