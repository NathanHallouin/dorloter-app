import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { getVisitSlotsForShelter } from "@shelters/public";
import { SlotsGrid } from "./slots-grid";

export const metadata: Metadata = {
  title: "Créneaux de visite · Refuge",
};

export default async function SheltersVisitSlotsPage() {
  const session = await requireShelter();
  const slots = await getVisitSlotsForShelter(session.user.shelterId);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-lavande-700">
          Paramètres
        </p>
        <h1 className="mt-1 inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <CalendarCheck className="h-7 w-7 text-coral-500" />
          Créneaux de visite
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Indiquez les créneaux récurrents où vous acceptez les visites
          (granularité 30 minutes). Les adoptants verront uniquement les
          créneaux ouverts sur les 14 prochains jours. Chaque créneau accepte
          un RDV à la fois par défaut, vous pouvez confirmer ou refuser
          ensuite.
        </p>
      </header>

      <section className="rounded-2xl border border-coral-200 bg-coral-50/40 p-4 text-sm text-coral-900">
        <p className="font-semibold">Comment ça marche</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>
            Cliquez sur une cellule pour activer ou désactiver le créneau
            correspondant (jour de semaine + 30 min).
          </li>
          <li>
            « Lun 14:00 » signifie tous les lundis à 14:00, sauf si une
            réservation est déjà acceptée à cette date précise.
          </li>
          <li>
            Tant que vous n&apos;avez pas validé, vous pouvez revenir en
            arrière.
          </li>
        </ul>
      </section>

      <SlotsGrid initialSlots={slots} />
    </div>
  );
}
