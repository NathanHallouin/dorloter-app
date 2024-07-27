"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@infra/db";
import {
  applications,
  pets,
  petPhotos,
  shelters,
  testimonials,
} from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { consumeRateLimit } from "@infra/rate-limit";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

const schema = z.object({
  petId: z.string().uuid(),
  content: z.string().min(20).max(1000),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

/**
 * Soumettre ou mettre à jour un témoignage post-adoption.
 *
 * Gardes :
 *   - auth requis
 *   - l'user doit avoir une candidature `acceptee` pour ce chat
 *   - rate-limit anti-spam
 *
 * Upsert (via ON CONFLICT) : un user peut éditer son propre témoignage.
 */
export async function submitTestimonial(input: {
  petId: string;
  content: string;
  photoUrl?: string;
}): Promise<ActionResponse<{ id: string }>> {
  const session = await requireAuth();

  const rate = await consumeRateLimit({
    key: "testimonial:submit",
    limit: 10,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Trop de soumissions récentes. Réessayez plus tard.`,
    };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Témoignage invalide (20 à 1000 caractères)." };
  }
  const { petId, content, photoUrl } = parsed.data;

  // Vérif : l'user a une candidature acceptée sur ce chat
  const [acceptedApp] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.userId, session.user.id),
        eq(applications.petId, petId),
        eq(applications.status, "acceptee")
      )
    )
    .limit(1);

  if (!acceptedApp) {
    return {
      success: false,
      error:
        "Seuls les adoptants dont la candidature a été acceptée peuvent témoigner.",
    };
  }

  const [row] = await db
    .insert(testimonials)
    .values({
      userId: session.user.id,
      petId,
      content: content.trim(),
      photoUrl: photoUrl || null,
    })
    .onConflictDoUpdate({
      target: [testimonials.userId, testimonials.petId],
      set: {
        content: content.trim(),
        photoUrl: photoUrl || null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: testimonials.id });

  logEvent(
    "testimonial.submitted",
    { petId, testimonialId: row!.id, updated: true },
    { userId: session.user.id }
  );

  revalidatePath(`/adopter/${petId}`);
  revalidatePath("/temoignages");

  return { success: true, data: { id: row!.id } };
}

export interface RecentTestimonial {
  id: string;
  content: string;
  photoUrl: string | null;
  createdAt: Date;
  /** Prénom seul (anonymisation RGPD). */
  authorFirstName: string;
  pet: {
    id: string;
    name: string;
    species: "chat" | "chien";
    photoUrl: string | null;
  };
  shelter: {
    id: string;
    name: string;
  } | null;
}

/**
 * Témoignages récents publiés, joints à la fiche animal (et son refuge).
 * Alimente la section "Ils ont trouvé leur compagnon" sur la home.
 *
 * Limite par défaut : 6 — on va vouloir un carrousel léger côté client.
 * Le nom complet n'est jamais exposé : on retourne uniquement le prénom
 * (premier mot du `users.name`).
 */
export async function getRecentTestimonials(
  limit = 6
): Promise<RecentTestimonial[]> {
  const rows = await db
    .select({
      id: testimonials.id,
      content: testimonials.content,
      photoUrl: testimonials.photoUrl,
      createdAt: testimonials.createdAt,
      authorName: sql<string>`(select name from users where id = ${testimonials.userId})`,
      petId: pets.id,
      petName: pets.name,
      petSpecies: pets.species,
      petPhotoUrl: sql<string | null>`(
        select url from ${petPhotos}
        where ${petPhotos.petId} = ${pets.id} and ${petPhotos.isPrimary} = true
        limit 1
      )`,
      shelterId: shelters.id,
      shelterName: shelters.name,
    })
    .from(testimonials)
    .innerJoin(pets, eq(pets.id, testimonials.petId))
    .leftJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(eq(testimonials.isPublished, true))
    .orderBy(desc(testimonials.createdAt))
    .limit(limit);

  return rows.map((r) => {
    const firstName = (r.authorName ?? "").split(/\s+/)[0] ?? "Anonyme";
    return {
      id: r.id,
      content: r.content,
      photoUrl: r.photoUrl,
      createdAt: r.createdAt,
      authorFirstName: firstName,
      pet: {
        id: r.petId,
        name: r.petName,
        species: r.petSpecies as "chat" | "chien",
        photoUrl: r.petPhotoUrl,
      },
      shelter: r.shelterId
        ? { id: r.shelterId, name: r.shelterName ?? "Refuge" }
        : null,
    };
  });
}

/**
 * Récupère le témoignage publié pour un chat (si présent). Utilisé côté
 * SSR sur la fiche chat.
 */
export async function getTestimonialForCat(petId: string) {
  const [row] = await db
    .select({
      id: testimonials.id,
      content: testimonials.content,
      photoUrl: testimonials.photoUrl,
      createdAt: testimonials.createdAt,
      updatedAt: testimonials.updatedAt,
      userId: testimonials.userId,
      userName: sql<string>`(select name from users where id = ${testimonials.userId})`,
    })
    .from(testimonials)
    .where(
      and(eq(testimonials.petId, petId), eq(testimonials.isPublished, true))
    )
    .limit(1);
  return row ?? null;
}

/**
 * Indique si l'utilisateur courant peut témoigner pour ce chat : il doit
 * avoir une candidature acceptée. Retourne aussi le témoignage existant
 * s'il en a déjà posté un (pour pré-remplir le formulaire d'édition).
 */
export async function getTestimonialContextForCat(petId: string) {
  const session = await requireAuth().catch(() => null);
  if (!session) return { canTestify: false, existing: null };

  const [acceptedApp] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.userId, session.user.id),
        eq(applications.petId, petId),
        eq(applications.status, "acceptee")
      )
    )
    .limit(1);

  if (!acceptedApp) return { canTestify: false, existing: null };

  const [existing] = await db
    .select({
      id: testimonials.id,
      content: testimonials.content,
      photoUrl: testimonials.photoUrl,
    })
    .from(testimonials)
    .where(
      and(
        eq(testimonials.userId, session.user.id),
        eq(testimonials.petId, petId)
      )
    )
    .limit(1);

  return { canTestify: true, existing: existing ?? null };
}

/**
 * Admin plateforme / refuge : masquer un témoignage (sans le supprimer).
 */
export async function unpublishTestimonial(
  testimonialId: string
): Promise<ActionResponse> {
  const session = await requireAuth();
  if (session.user.role !== "platform_admin" && session.user.role !== "shelter_admin") {
    return { success: false, error: "Non autorisé." };
  }

  // Pour shelter_admin : vérifier que le chat appartient à son refuge
  if (session.user.role === "shelter_admin") {
    const [row] = await db
      .select({ shelterId: pets.shelterId })
      .from(testimonials)
      .innerJoin(pets, eq(pets.id, testimonials.petId))
      .where(eq(testimonials.id, testimonialId))
      .limit(1);
    if (!row || row.shelterId !== session.user.shelterId) {
      return { success: false, error: "Non autorisé." };
    }
  }

  await db
    .update(testimonials)
    .set({ isPublished: false, updatedAt: new Date() })
    .where(eq(testimonials.id, testimonialId));

  logEvent(
    "testimonial.unpublished",
    { testimonialId },
    { level: "warn", userId: session.user.id }
  );

  return { success: true };
}
