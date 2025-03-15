import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { getEventsForShelter } from "@shelters/public";
import { EventsManager } from "./events-manager";

export const metadata: Metadata = {
  title: "Événements · Refuge",
};

export default async function ShelterEventsPage() {
  const session = await requireShelter();
  const events = await getEventsForShelter(session.user.shelterId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Calendar className="h-7 w-7 text-coral-500" />
          Événements
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Annoncez vos portes ouvertes, collectes, salons, ou appels à
          l&apos;aide. Les événements publiés apparaissent sur la page
          publique <strong>/evenements</strong> et notifient les utilisateurs
          du secteur.
        </p>
      </div>

      <EventsManager initialEvents={events} />
    </div>
  );
}
