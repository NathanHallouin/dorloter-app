import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@infra/db";
import { veterinarians } from "@/server/db/schema";
import type { MapPoint } from "@shared/utils/map";

/**
 * Points carto des cabinets vétérinaires vérifiés.
 */
export async function getVetMapPoints(): Promise<MapPoint[]> {
  const rows = await db
    .select({
      id: veterinarians.id,
      slug: veterinarians.slug,
      name: veterinarians.name,
      address: veterinarians.address,
      location: veterinarians.location,
      emergency: veterinarians.emergencyAvailable,
      isVerified: veterinarians.isVerified,
      isDemo: veterinarians.isDemo,
    })
    .from(veterinarians)
    .where(
      and(eq(veterinarians.isVerified, true), isNotNull(veterinarians.location))
    )
    .limit(3000);

  return rows
    .filter((r) => r.location !== null)
    .map((r) => ({
      id: r.id,
      kind: "veto" as const,
      lat: r.location!.y,
      lng: r.location!.x,
      title: r.name,
      subtitle: r.emergency
        ? `Urgences 24/7 · ${r.address ?? ""}`.trim().replace(/·\s*$/, "")
        : (r.address ?? null),
      href: `/veterinaires/${r.slug}`,
      isVerified: r.isVerified,
      isDemo: r.isDemo,
    }));
}
