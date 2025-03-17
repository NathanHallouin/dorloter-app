"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterNewsPosts, shelters } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import { requirePlatformAdmin } from "@infra/auth/session";
import { slugify, extractExcerpt } from "../lib/news-markdown";
import type { ActionResponse } from "@/types";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["adoption", "evenement", "urgence", "temoignage", "autre"]),
  title: z.string().trim().min(3, "Titre trop court").max(255),
  body: z.string().trim().min(50, "Contenu trop court (50 caractères min)"),
  excerpt: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
  coverUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),
  publish: z.boolean().default(false),
});

async function generateUniqueSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "actualite";
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await db
      .select({ id: shelterNewsPosts.id })
      .from(shelterNewsPosts)
      .where(eq(shelterNewsPosts.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    if (existing[0]?.id === excludeId) return candidate;
    suffix++;
    if (suffix > 100) {
      // Failsafe : on dégrade en slug avec timestamp-ish via length
      return `${slug}-${candidate.length}-${suffix}`;
    }
  }
}

/**
 * Crée un brouillon ou publie directement. Refuges vérifiés publient
 * immédiatement, les autres passent par la file de modération.
 */
export async function upsertNewsPost(
  input: unknown
): Promise<ActionResponse<{ id: string; slug: string; status: string }>> {
  const session = await requireShelter();
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;

  const [shelter] = await db
    .select({ isVerified: shelters.isVerified })
    .from(shelters)
    .where(eq(shelters.id, session.user.shelterId))
    .limit(1);
  if (!shelter) return { success: false, error: "Refuge introuvable." };

  const excerpt = data.excerpt?.trim() || extractExcerpt(data.body);
  const coverUrl = data.coverUrl?.trim() || null;

  // Update
  if (data.id) {
    const [existing] = await db
      .select()
      .from(shelterNewsPosts)
      .where(eq(shelterNewsPosts.id, data.id))
      .limit(1);
    if (!existing || existing.shelterId !== session.user.shelterId) {
      return { success: false, error: "Article introuvable." };
    }
    if (existing.status === "publie" && !data.publish) {
      // Édition d'un post publié -> retour en brouillon implicite refusé.
      // L'auteur doit explicitement republier.
    }

    const willPublish = data.publish;
    const nextStatus = willPublish
      ? shelter.isVerified
        ? "publie"
        : "en_attente_modo"
      : "brouillon";

    const slug =
      existing.title === data.title
        ? existing.slug
        : await generateUniqueSlug(data.title, existing.id);

    await db
      .update(shelterNewsPosts)
      .set({
        type: data.type,
        title: data.title,
        body: data.body,
        excerpt,
        coverUrl,
        slug,
        status: nextStatus,
        publishedAt:
          nextStatus === "publie"
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
        rejectedReason: null,
        updatedAt: new Date(),
      })
      .where(eq(shelterNewsPosts.id, existing.id));

    revalidatePath("/shelter-actualites");
    revalidatePath("/actualites");
    revalidatePath(`/actualites/${slug}`);
    return { success: true, data: { id: existing.id, slug, status: nextStatus } };
  }

  // Create
  const slug = await generateUniqueSlug(data.title);
  const status: "brouillon" | "publie" | "en_attente_modo" = data.publish
    ? shelter.isVerified
      ? "publie"
      : "en_attente_modo"
    : "brouillon";

  const [created] = await db
    .insert(shelterNewsPosts)
    .values({
      shelterId: session.user.shelterId,
      authorId: session.user.id,
      type: data.type,
      status,
      slug,
      title: data.title,
      body: data.body,
      excerpt,
      coverUrl,
      publishedAt: status === "publie" ? new Date() : null,
    })
    .returning({ id: shelterNewsPosts.id });

  if (!created) {
    return { success: false, error: "Création impossible." };
  }

  revalidatePath("/shelter-actualites");
  revalidatePath("/actualites");
  return { success: true, data: { id: created.id, slug, status } };
}

export async function deleteNewsPost(id: string): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({ shelterId: shelterNewsPosts.shelterId, slug: shelterNewsPosts.slug })
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.id, id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Article introuvable." };
  }
  await db.delete(shelterNewsPosts).where(eq(shelterNewsPosts.id, id));
  revalidatePath("/shelter-actualites");
  revalidatePath("/actualites");
  revalidatePath(`/actualites/${existing.slug}`);
  return { success: true };
}

export async function archiveNewsPost(id: string): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({ shelterId: shelterNewsPosts.shelterId, slug: shelterNewsPosts.slug })
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.id, id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Article introuvable." };
  }
  await db
    .update(shelterNewsPosts)
    .set({ status: "archive", updatedAt: new Date() })
    .where(eq(shelterNewsPosts.id, id));
  revalidatePath("/shelter-actualites");
  revalidatePath("/actualites");
  revalidatePath(`/actualites/${existing.slug}`);
  return { success: true };
}

// ─── Modération platform_admin ────────────────────────────────────────────

const moderationSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function approveNewsPost(
  input: unknown
): Promise<ActionResponse> {
  await requirePlatformAdmin();
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const [existing] = await db
    .select({ status: shelterNewsPosts.status, slug: shelterNewsPosts.slug })
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.id, parsed.data.id))
    .limit(1);
  if (!existing) return { success: false, error: "Article introuvable." };
  if (existing.status !== "en_attente_modo") {
    return { success: false, error: "Article déjà modéré." };
  }

  await db
    .update(shelterNewsPosts)
    .set({
      status: "publie",
      publishedAt: new Date(),
      rejectedReason: null,
      updatedAt: new Date(),
    })
    .where(eq(shelterNewsPosts.id, parsed.data.id));
  revalidatePath("/admin/actualites");
  revalidatePath("/actualites");
  revalidatePath(`/actualites/${existing.slug}`);
  return { success: true };
}

export async function rejectNewsPost(
  input: unknown
): Promise<ActionResponse> {
  await requirePlatformAdmin();
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const [existing] = await db
    .select({ status: shelterNewsPosts.status })
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.id, parsed.data.id))
    .limit(1);
  if (!existing) return { success: false, error: "Article introuvable." };
  if (existing.status !== "en_attente_modo") {
    return { success: false, error: "Article déjà modéré." };
  }

  await db
    .update(shelterNewsPosts)
    .set({
      status: "refuse",
      rejectedReason: parsed.data.reason || null,
      updatedAt: new Date(),
    })
    .where(eq(shelterNewsPosts.id, parsed.data.id));
  revalidatePath("/admin/actualites");
  revalidatePath("/shelter-actualites");
  return { success: true };
}
