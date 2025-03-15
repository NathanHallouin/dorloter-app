import { and, desc, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { savedSearches } from "@/server/db/schema";
import type {
  SavedSearch,
  SavedSearchKind,
} from "../lib/saved-search-types";

export type { SavedSearch, SavedSearchKind };

function castRow(row: typeof savedSearches.$inferSelect): SavedSearch {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as SavedSearchKind,
    name: row.name,
    params: (row.params ?? {}) as Record<string, unknown>,
    isActive: row.isActive,
    pushEnabled: row.pushEnabled,
    lastNotifiedAt: row.lastNotifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getSavedSearchesByUser(
  userId: string
): Promise<SavedSearch[]> {
  const rows = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt));
  return rows.map(castRow);
}

export async function getSavedSearchById(
  id: string
): Promise<SavedSearch | null> {
  const [row] = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.id, id))
    .limit(1);
  return row ? castRow(row) : null;
}

export async function getActiveSavedSearchesByKind(
  kind: SavedSearchKind
): Promise<SavedSearch[]> {
  const rows = await db
    .select()
    .from(savedSearches)
    .where(
      and(eq(savedSearches.kind, kind), eq(savedSearches.isActive, true))
    );
  return rows.map(castRow);
}

/**
 * Recherches `lost-found` actives avec push activé — utilisé par le
 * listener « guetteur » qui alerte immédiatement à la publication d'un
 * signalement matchant.
 */
export async function getPushEnabledLostFoundSearches(): Promise<SavedSearch[]> {
  const rows = await db
    .select()
    .from(savedSearches)
    .where(
      and(
        eq(savedSearches.kind, "lost-found"),
        eq(savedSearches.isActive, true),
        eq(savedSearches.pushEnabled, true)
      )
    );
  return rows.map(castRow);
}
