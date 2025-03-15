import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { reports } from "@/server/db/schema";
import type { MapPoint } from "@shared/utils/map";

/**
 * Points carto des signalements actifs (perdu + trouvé). Le `kind` est
 * dérivé du `type` pour qu'un layer indépendant puisse être toggle.
 */
export async function getReportMapPoints(): Promise<MapPoint[]> {
  const rows = await db
    .select({
      id: reports.id,
      type: reports.type,
      species: reports.species,
      petName: reports.petName,
      address: reports.address,
      location: reports.location,
      isDemo: reports.isDemo,
    })
    .from(reports)
    .where(eq(reports.status, "actif"))
    .limit(2000);

  return rows.map((r) => {
    const speciesLabel = r.species === "chat" ? "chat" : "chien";
    const title =
      r.type === "perdu"
        ? r.petName
          ? `${r.petName} (${speciesLabel} perdu)`
          : `${speciesLabel} perdu`
        : `${speciesLabel} trouvé`;
    return {
      id: r.id,
      kind:
        r.type === "perdu"
          ? ("report-perdu" as const)
          : ("report-trouve" as const),
      lat: r.location.y,
      lng: r.location.x,
      title,
      subtitle: r.address ?? null,
      href: `/perdus-trouves/${r.id}`,
      isDemo: r.isDemo,
    };
  });
}
