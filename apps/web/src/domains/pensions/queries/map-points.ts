import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@infra/db";
import { pensions } from "@/server/db/schema";
import type { MapPoint } from "@shared/utils/map";

/**
 * Points carto des pensions : uniquement les vérifiées (annuaire public).
 */
export async function getPensionMapPoints(): Promise<MapPoint[]> {
  const rows = await db
    .select({
      id: pensions.id,
      slug: pensions.slug,
      name: pensions.name,
      address: pensions.address,
      location: pensions.location,
      isVerified: pensions.isVerified,
      isDemo: pensions.isDemo,
    })
    .from(pensions)
    .where(
      and(eq(pensions.isVerified, true), isNotNull(pensions.location))
    )
    .limit(2000);

  return rows
    .filter((r) => r.location !== null)
    .map((r) => ({
      id: r.id,
      kind: "pension" as const,
      lat: r.location!.y,
      lng: r.location!.x,
      title: r.name,
      subtitle: r.address ?? null,
      href: `/pensions/${r.slug}`,
      isVerified: r.isVerified,
      isDemo: r.isDemo,
    }));
}
