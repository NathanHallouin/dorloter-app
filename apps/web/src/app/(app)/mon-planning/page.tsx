import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Clock, ExternalLink, Users } from "lucide-react";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getActiveVolunteerRecordsForUser,
  getTotalVolunteerHoursForUser,
  getUpcomingShiftsForUser,
} from "@shelters/public";
import { MyPlanningActions } from "./planning-actions";

export const metadata: Metadata = {
  title: "Mon planning bénévole",
};

export default async function MyPlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/mon-planning");

  const [records, upcoming, totalHours] = await Promise.all([
    getActiveVolunteerRecordsForUser(session.user.id),
    getUpcomingShiftsForUser(session.user.id),
    getTotalVolunteerHoursForUser(session.user.id),
  ]);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <header className="mb-8">
          <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
            <Calendar className="h-7 w-7 text-coral-500" />
            Mon planning bénévole
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vos créneaux à venir, vos heures cumulées et les refuges où vous
            êtes actif.
          </p>
        </header>

        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          <Stat
            icon={Clock}
            value={`${totalHours} h`}
            label="Heures comptabilisées"
          />
          <Stat
            icon={Calendar}
            value={upcoming.length}
            label="Créneaux à venir"
          />
          <Stat
            icon={Users}
            value={records.length}
            label={records.length > 1 ? "Refuges actifs" : "Refuge actif"}
          />
        </section>

        {records.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Vos refuges
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/devenir-benevole/${r.shelterSlug}`}
                      className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-coral-600"
                    >
                      {r.shelterName}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {r.totalHours} h · {r.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Prochains créneaux
          </h2>
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Vous n&apos;avez aucun créneau à venir.
              {records.length > 0 && (
                <>
                  {" "}
                  <Link
                    href={`/devenir-benevole/${records[0]?.shelterSlug}`}
                    className="font-medium text-coral-700 hover:underline"
                  >
                    Inscrivez-vous à un créneau →
                  </Link>
                </>
              )}
            </p>
          ) : (
            <MyPlanningActions signups={upcoming} />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="mb-1.5 h-5 w-5 text-coral-500" />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
