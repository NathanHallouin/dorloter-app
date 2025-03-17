import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Home } from "lucide-react";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import {
  getFosterFamiliesForShelter,
  getActivePlacementsForShelter,
  getPetsAvailableForFosterPlacement,
} from "@shelters/public";
import { FosterFamiliesPanel } from "./families-panel";

export const metadata: Metadata = {
  title: "Familles d'accueil · Refuge",
};

export default async function ShelterFosterPage() {
  const session = await requireShelter();
  const [families, activePlacements, availablePets, shelter] =
    await Promise.all([
      getFosterFamiliesForShelter(session.user.shelterId),
      getActivePlacementsForShelter(session.user.shelterId),
      getPetsAvailableForFosterPlacement(session.user.shelterId),
      db
        .select({ slug: shelters.slug })
        .from(shelters)
        .where(eq(shelters.id, session.user.shelterId))
        .then((r) => r[0]),
    ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Home className="h-7 w-7 text-coral-500" />
          Familles d&apos;accueil
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gérez les candidatures, vos familles validées et les placements
          temporaires en cours. Lien public à partager :{" "}
          <code className="rounded bg-sable-100 px-1.5 py-0.5 text-[11px]">
            /familles-accueil/{shelter?.slug ?? "[refuge]"}
          </code>
        </p>
      </header>

      <FosterFamiliesPanel
        families={families}
        placements={activePlacements}
        availablePets={availablePets}
      />
    </div>
  );
}
