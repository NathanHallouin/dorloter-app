import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  shelterNewsPosts,
  shelters,
  users,
} from "@/server/db/schema";
import type {
  NewsPost,
  NewsPostStatus,
  NewsPostType,
  NewsPostWithShelter,
} from "../lib/news-post-types";

function rowToPost(r: typeof shelterNewsPosts.$inferSelect): NewsPost {
  return {
    id: r.id,
    shelterId: r.shelterId,
    authorId: r.authorId,
    type: r.type as NewsPostType,
    status: r.status as NewsPostStatus,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    body: r.body,
    coverUrl: r.coverUrl,
    publishedAt: r.publishedAt,
    rejectedReason: r.rejectedReason,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function shelterCityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  return parts[parts.length - 2] ?? parts[0] ?? null;
}

async function fetchEnriched(
  conditions: ReturnType<typeof eq>[]
): Promise<NewsPostWithShelter[]> {
  const rows = await db
    .select({
      post: shelterNewsPosts,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
      shelterIsVerified: shelters.isVerified,
      shelterAddress: shelters.address,
    })
    .from(shelterNewsPosts)
    .innerJoin(shelters, eq(shelters.id, shelterNewsPosts.shelterId))
    .where(and(...conditions))
    .orderBy(
      desc(shelterNewsPosts.publishedAt),
      desc(shelterNewsPosts.createdAt)
    );

  return rows.map((r) => ({
    ...rowToPost(r.post),
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    shelterIsVerified: r.shelterIsVerified,
    shelterCity: shelterCityFromAddress(r.shelterAddress),
  }));
}

/**
 * Liste publique : posts `publie`, optionnellement filtrés par type
 * et/ou refuge.
 */
export async function listPublishedNewsPosts(filters: {
  type?: NewsPostType;
  shelterId?: string;
  limit?: number;
}): Promise<NewsPostWithShelter[]> {
  const conditions: ReturnType<typeof eq>[] = [
    eq(shelterNewsPosts.status, "publie"),
  ];
  if (filters.type) conditions.push(eq(shelterNewsPosts.type, filters.type));
  if (filters.shelterId)
    conditions.push(eq(shelterNewsPosts.shelterId, filters.shelterId));

  const rows = await fetchEnriched(conditions);
  return filters.limit ? rows.slice(0, filters.limit) : rows;
}

export async function getNewsPostBySlug(
  slug: string
): Promise<NewsPostWithShelter | null> {
  const rows = await fetchEnriched([
    eq(shelterNewsPosts.slug, slug),
    eq(shelterNewsPosts.status, "publie"),
  ]);
  return rows[0] ?? null;
}

/** Tous les posts d'un refuge (toutes statuts) pour vue refuge. */
export async function getNewsPostsForShelter(
  shelterId: string
): Promise<NewsPost[]> {
  const rows = await db
    .select()
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.shelterId, shelterId))
    .orderBy(desc(shelterNewsPosts.updatedAt));
  return rows.map(rowToPost);
}

export async function getNewsPostById(id: string): Promise<NewsPost | null> {
  const [row] = await db
    .select()
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.id, id))
    .limit(1);
  return row ? rowToPost(row) : null;
}

/** Vérifie qu'un slug n'est pas déjà pris, optionnellement excluant un id. */
export async function isSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const rows = await db
    .select({ id: shelterNewsPosts.id })
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.slug, slug))
    .limit(1);
  if (rows.length === 0) return true;
  return !!excludeId && rows[0]?.id === excludeId;
}

/** File de modération pour platform_admin : posts en_attente_modo. */
export async function getNewsPostsAwaitingModeration(): Promise<
  NewsPostWithShelter[]
> {
  return fetchEnriched([eq(shelterNewsPosts.status, "en_attente_modo")]);
}

export async function countNewsPostsAwaitingModeration(): Promise<number> {
  const rows = await db
    .select({ id: shelterNewsPosts.id })
    .from(shelterNewsPosts)
    .where(eq(shelterNewsPosts.status, "en_attente_modo"));
  return rows.length;
}

/** Liste de refuges qui ont au moins un post publié — pour filtres UI. */
export async function getSheltersWithNewsPosts(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  const rows = await db
    .selectDistinct({
      id: shelters.id,
      name: shelters.name,
      slug: shelters.slug,
    })
    .from(shelterNewsPosts)
    .innerJoin(shelters, eq(shelters.id, shelterNewsPosts.shelterId))
    .where(eq(shelterNewsPosts.status, "publie"))
    .orderBy(shelters.name);
  return rows;
}
