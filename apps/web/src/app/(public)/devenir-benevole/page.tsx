import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  ArrowRight,
  BadgeCheck,
  HandHeart,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Devenir bénévole pour un refuge",
  description:
    "Donnez quelques heures par semaine à un refuge partenaire Dorloter : balades, soins, accueil public, événements. Choisissez votre refuge, candidatez, inscrivez-vous aux créneaux qui vous conviennent.",
  alternates: { canonical: "/devenir-benevole" },
};

export default async function VolunteerHubPage() {
  const verifiedShelters = await db
    .select({
      id: shelters.id,
      name: shelters.name,
      slug: shelters.slug,
      address: shelters.address,
    })
    .from(shelters)
    .where(eq(shelters.isVerified, true))
    .orderBy(shelters.name);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700">
            <Sparkles className="h-3 w-3" />
            Donner du temps
          </div>
          <h1 className="text-3xl font-bold text-foreground md:text-5xl">
            Devenir bénévole
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            Promener un chien, socialiser un chat craintif, tenir une
            permanence, aider sur un événement : les refuges ont besoin de
            vous. Trouvez celui qui est proche, candidatez, inscrivez-vous
            aux créneaux qui vous arrangent.
          </p>
        </header>

        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          <Pillar
            icon={HandHeart}
            title="Vous candidatez"
            body="Une candidature par refuge, validée par l'équipe avant accès aux créneaux."
          />
          <Pillar
            icon={Users}
            title="Vous vous inscrivez"
            body="Le refuge publie les créneaux. Vous choisissez ceux qui vous conviennent."
          />
          <Pillar
            icon={Heart}
            title="Le refuge compte vos heures"
            body="Pointage à l'arrivée et au départ. Vous suivez votre cumul depuis votre tableau de bord."
          />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Refuges qui accueillent des bénévoles
          </h2>
          {verifiedShelters.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucun refuge vérifié pour le moment.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {verifiedShelters.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/devenir-benevole/${s.slug}`}
                    className="group block h-full rounded-2xl border border-border bg-card p-4 transition hover:border-coral-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">
                        {s.name}
                      </h3>
                      <BadgeCheck className="h-4 w-4 shrink-0 text-coral-500" />
                    </div>
                    {s.address && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {s.address}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-coral-600 group-hover:gap-2">
                      Candidater
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof HandHeart;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="mb-3 h-7 w-7 text-coral-500" />
      <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
