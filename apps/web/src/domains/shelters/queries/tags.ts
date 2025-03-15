import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@infra/db";
import { petTagAssignments, shelterTags } from "@/server/db/schema";
import type { TagColor } from "../lib/tag-colors";
import type { ShelterTag } from "../lib/tag-types";

export type { ShelterTag };

function castRow(
  row: typeof shelterTags.$inferSelect
): ShelterTag {
  return {
    id: row.id,
    shelterId: row.shelterId,
    name: row.name,
    color: row.color as TagColor,
    isPublic: row.isPublic,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getTagsForShelter(
  shelterId: string
): Promise<ShelterTag[]> {
  const rows = await db
    .select()
    .from(shelterTags)
    .where(eq(shelterTags.shelterId, shelterId))
    .orderBy(asc(shelterTags.position), asc(shelterTags.createdAt));
  return rows.map(castRow);
}

/**
 * Pour un lot de pets, retourne Map<petId, ShelterTag[]>. Utilisé sur la
 * liste refuge pour afficher les tags inline, et sur la fiche publique
 * pour les tags `is_public`.
 */
export async function getTagsForPets(
  petIds: string[]
): Promise<Map<string, ShelterTag[]>> {
  const map = new Map<string, ShelterTag[]>();
  if (petIds.length === 0) return map;

  const rows = await db
    .select({
      petId: petTagAssignments.petId,
      tag: shelterTags,
    })
    .from(petTagAssignments)
    .innerJoin(shelterTags, eq(shelterTags.id, petTagAssignments.tagId))
    .where(inArray(petTagAssignments.petId, petIds))
    .orderBy(asc(shelterTags.position), asc(shelterTags.name));

  for (const r of rows) {
    const list = map.get(r.petId) ?? [];
    list.push(castRow(r.tag));
    map.set(r.petId, list);
  }
  return map;
}

export async function getTagsForPet(petId: string): Promise<ShelterTag[]> {
  const map = await getTagsForPets([petId]);
  return map.get(petId) ?? [];
}
