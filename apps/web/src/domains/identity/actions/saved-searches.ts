"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@infra/db";
import { savedSearches } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import type { ActionResponse } from "@/types";
import {
  adoptionSearchParamsSchema,
  lostFoundSearchParamsSchema,
} from "../lib/saved-search-params";

const MAX_SAVED_PER_USER = 20;

const createSchema = z.object({
  kind: z.enum(["adoption", "lost-found"]),
  name: z.string().trim().min(2, "Nom trop court").max(120),
  params: z.unknown(),
});

export async function createSavedSearch(input: {
  kind: "adoption" | "lost-found";
  name: string;
  params: unknown;
}): Promise<ActionResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }

  // Valider les params selon le kind.
  const paramsSchema =
    parsed.data.kind === "adoption"
      ? adoptionSearchParamsSchema
      : lostFoundSearchParamsSchema;
  const paramsParsed = paramsSchema.safeParse(parsed.data.params ?? {});
  if (!paramsParsed.success) {
    return {
      success: false,
      error: "Filtres de recherche invalides.",
    };
  }

  // Plafond anti-abus.
  const existing = await db
    .select({ id: savedSearches.id })
    .from(savedSearches)
    .where(eq(savedSearches.userId, session.user.id));
  if (existing.length >= MAX_SAVED_PER_USER) {
    return {
      success: false,
      error: `Vous avez atteint la limite (${MAX_SAVED_PER_USER}). Supprimez une recherche pour en ajouter une nouvelle.`,
    };
  }

  const [created] = await db
    .insert(savedSearches)
    .values({
      userId: session.user.id,
      kind: parsed.data.kind,
      name: parsed.data.name,
      params: paramsParsed.data,
    })
    .returning({ id: savedSearches.id });

  if (!created) {
    return { success: false, error: "Création impossible." };
  }

  revalidatePath("/profil/recherches");
  return { success: true, data: { id: created.id } };
}

export async function deleteSavedSearch(id: string): Promise<ActionResponse> {
  const session = await requireAuth();
  await db
    .delete(savedSearches)
    .where(
      and(
        eq(savedSearches.id, id),
        eq(savedSearches.userId, session.user.id)
      )
    );
  revalidatePath("/profil/recherches");
  return { success: true };
}

export async function toggleSavedSearch(
  id: string,
  isActive: boolean
): Promise<ActionResponse> {
  const session = await requireAuth();
  await db
    .update(savedSearches)
    .set({ isActive, updatedAt: new Date() })
    .where(
      and(
        eq(savedSearches.id, id),
        eq(savedSearches.userId, session.user.id)
      )
    );
  revalidatePath("/profil/recherches");
  return { success: true };
}

/**
 * Active ou désactive le mode « guetteur » (push instantané) pour une
 * recherche `lost-found`. Vérifie que l'utilisateur a bien une push
 * subscription enregistrée — sinon on refuse l'activation.
 */
export async function toggleSavedSearchPush(
  id: string,
  pushEnabled: boolean
): Promise<ActionResponse> {
  const session = await requireAuth();

  if (pushEnabled) {
    const { users } = await import("@/server/db/schema");
    const [user] = await db
      .select({ pushSubscription: users.pushSubscription })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (!user?.pushSubscription) {
      return {
        success: false,
        error:
          "Activez d'abord les notifications push depuis votre profil pour recevoir les alertes guetteur.",
      };
    }
  }

  await db
    .update(savedSearches)
    .set({ pushEnabled, updatedAt: new Date() })
    .where(
      and(
        eq(savedSearches.id, id),
        eq(savedSearches.userId, session.user.id),
        eq(savedSearches.kind, "lost-found")
      )
    );
  revalidatePath("/profil/recherches");
  return { success: true };
}

export async function renameSavedSearch(
  id: string,
  name: string
): Promise<ActionResponse> {
  const session = await requireAuth();
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    return { success: false, error: "Nom invalide (2 à 120 caractères)." };
  }
  await db
    .update(savedSearches)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(
      and(
        eq(savedSearches.id, id),
        eq(savedSearches.userId, session.user.id)
      )
    );
  revalidatePath("/profil/recherches");
  return { success: true };
}
