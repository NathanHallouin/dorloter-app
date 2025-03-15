import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ChevronLeft, Heart, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  getRetrouvaillesMapPoints,
  type RetrouvaillesMapPoint,
} from "@lost-found/public";
import { RetrouvaillesMap } from "./retrouvailles-map";

export const metadata: Metadata = {
  title: "Carte des retrouvailles",
  description:
    "Chaque point représente un animal perdu qui a retrouvé sa famille grâce à Dorloter. Données anonymisées.",
  alternates: { canonical: "/perdus-trouves/retrouvailles/carte" },
  openGraph: {
    title: "Carte des retrouvailles · Dorloter",
    description:
      "La carte des familles réunies. Une histoire de quartier, multipliée par mille.",
    type: "website",
  },
};

const loadPoints = unstable_cache(
  async (): Promise<RetrouvaillesMapPoint[]> => {
    try {
      return await getRetrouvaillesMapPoints();
    } catch (err) {
      console.error("[retrouvailles-map] failed, returning empty", err);
      return [];
    }
  },
  ["retrouvailles-map-points-v1"],
  { revalidate: 600, tags: ["retrouvailles-map"] }
);

export default async function RetrouvaillesCartePage() {
  const points = await loadPoints();

  return (
    <>
      <Navbar />
      <header className="border-b border-sable-200 bg-gradient-to-br from-coral-50/50 via-white to-sable-50 px-4 py-5">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/perdus-trouves/retrouvailles"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-coral-600"
            >
              <ChevronLeft className="h-3 w-3" />
              Retour aux retrouvailles
            </Link>
            <h1 className="mt-1.5 inline-flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
              <Heart className="h-6 w-6 fill-coral-500 text-coral-500" />
              Carte des retrouvailles
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Chaque point est une histoire. Position du lieu de découverte,
              date anonymisée, aucun nom révélé.
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-coral-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral-800 sm:inline-flex">
            <ShieldCheck className="h-3 w-3" />
            {points.length} confirmées
          </div>
        </div>
      </header>

      <main id="main" className="w-full flex-1">
        <RetrouvaillesMap points={points} />
      </main>
    </>
  );
}
