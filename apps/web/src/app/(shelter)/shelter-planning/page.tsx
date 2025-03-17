import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import {
  getShiftsForShelter,
  getVolunteersForShelter,
  getSignupsForShift,
} from "@shelters/public";
import { PlanningPanel } from "./planning-panel";

export const metadata: Metadata = {
  title: "Planning bénévoles · Refuge",
};

export default async function ShelterPlanningPage() {
  const session = await requireShelter();
  const [shifts, volunteers, shelter] = await Promise.all([
    getShiftsForShelter(session.user.shelterId),
    getVolunteersForShelter(session.user.shelterId),
    db
      .select({ slug: shelters.slug })
      .from(shelters)
      .where(eq(shelters.id, session.user.shelterId))
      .then((r) => r[0]),
  ]);

  // Charge les signups pour les shifts à venir / en cours (les 30 prochains)
  const signupsByShift = new Map<
    string,
    Awaited<ReturnType<typeof getSignupsForShift>>
  >();
  const relevant = shifts.filter(
    (s) =>
      s.status === "ouvert" ||
      s.status === "complet" ||
      (s.status === "termine" &&
        new Date(s.startsAt).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 7)
  );
  for (const s of relevant) {
    const signups = await getSignupsForShift(s.id);
    signupsByShift.set(s.id, signups);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Users className="h-7 w-7 text-coral-500" />
          Planning bénévoles
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Créez des créneaux ponctuels, validez vos bénévoles, pointez les
          arrivées et départs pour comptabiliser les heures. Lien public :{" "}
          <code className="rounded bg-sable-100 px-1.5 py-0.5 text-[11px]">
            /devenir-benevole/{shelter?.slug ?? "[refuge]"}
          </code>
        </p>
      </header>

      <PlanningPanel
        shifts={shifts}
        volunteers={volunteers}
        signupsByShift={Object.fromEntries(signupsByShift)}
      />
    </div>
  );
}
