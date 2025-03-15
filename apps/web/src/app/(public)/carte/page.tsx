import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Navbar } from "@/components/layout/navbar";
import { getShelterMapPoints } from "@shelters/public";
import { getPensionMapPoints } from "@pensions/public";
import { getVetMapPoints } from "@veterinarians/public";
import { getReportMapPoints } from "@lost-found/public";
import type { MapPoint } from "@shared/utils/map";
import { MapExplorer } from "./map-explorer";

export const metadata: Metadata = {
  title: "Carte interactive",
  description:
    "Refuges, pensions, vétérinaires et signalements actifs en France, sur une seule carte. Filtrable par type d'acteur.",
  alternates: { canonical: "/carte" },
  openGraph: {
    title: "Carte interactive · Dorloter",
    description:
      "Tous les acteurs de la communauté animale française sur une carte.",
    type: "website",
  },
};

async function safe<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[carte] ${label} failed, using fallback`, err);
    return fallback;
  }
}

const loadAllMapPoints = unstable_cache(
  async (): Promise<MapPoint[]> => {
    // Séquentiel pour éviter de saturer le transaction pooler Supabase.
    // Chaque source est isolée : un échec ne masque pas les autres.
    const refuges = await safe(getShelterMapPoints, [], "shelters");
    const pensions = await safe(getPensionMapPoints, [], "pensions");
    const vetos = await safe(getVetMapPoints, [], "vetos");
    const reports = await safe(getReportMapPoints, [], "reports");
    return [...refuges, ...pensions, ...vetos, ...reports];
  },
  ["carte-france-map-points-v2"],
  { revalidate: 300, tags: ["map-points"] }
);

export default async function CartePage() {
  const points = await loadAllMapPoints();
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <MapExplorer points={points} />
      </main>
    </>
  );
}
