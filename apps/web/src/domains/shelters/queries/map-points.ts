import { isNotNull } from "drizzle-orm";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import type { MapPoint } from "@shared/utils/map";

/**
 * Points carto des refuges (tous, vérifiés ou non — le filtre is_verified
 * est appliqué côté client pour pouvoir basculer dynamiquement).
 */
export async function getShelterMapPoints(): Promise<MapPoint[]> {
  const rows = await db
    .select({
      id: shelters.id,
      slug: shelters.slug,
      name: shelters.name,
      city: shelters.address,
      location: shelters.location,
      isVerified: shelters.isVerified,
      isDemo: shelters.isDemo,
    })
    .from(shelters)
    .where(isNotNull(shelters.location))
    .limit(2000);

  return rows
    .filter((r) => r.location !== null)
    .map((r) => ({
      id: r.id,
      kind: "refuge" as const,
      lat: r.location!.y,
      lng: r.location!.x,
      title: r.name,
      subtitle: r.city ?? null,
      href: `/refuges/${r.slug}`,
      isVerified: r.isVerified,
      isDemo: r.isDemo,
    }));
}
