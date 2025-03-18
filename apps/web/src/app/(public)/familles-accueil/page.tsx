import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  Home,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Devenir famille d'accueil pour un refuge",
  description:
    "Hébergez temporairement un animal pour un refuge partenaire Dorloter. Sociabilisation, soins, libérer une place : devenir famille d'accueil sauve des vies.",
  alternates: { canonical: "/familles-accueil" },
  openGraph: {
    title: "Devenir famille d'accueil · Dorloter",
    description:
      "Hébergez temporairement un animal pour un refuge partenaire.",
    url: "/familles-accueil",
    type: "website",
  },
};

export default async function FosterHubPage() {
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
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700">
            <Sparkles className="h-3 w-3" />
            Solidaire & flexible
          </div>
          <h1 className="text-3xl font-bold text-foreground md:text-5xl">
            Devenir famille d&apos;accueil
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            Un refuge complet ne peut plus accueillir d&apos;urgences. Une
            famille d&apos;accueil (FA) héberge temporairement un animal,
            libère une place, lui offre un cadre apaisé jusqu&apos;à son
            adoption.
          </p>
        </header>

        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          <Pillar
            icon={Home}
            title="Vous hébergez"
            body="Quelques jours, quelques semaines, parfois plus. Le refuge fixe le cadre."
          />
          <Pillar
            icon={Heart}
            title="Le refuge encadre"
            body="Frais vétérinaires couverts, contact direct, conseils, retour possible à tout moment."
          />
          <Pillar
            icon={Users}
            title="L'animal s'apaise"
            body="Sortir du box, retrouver une vie de famille, augmenter ses chances d'adoption."
          />
        </section>

        <section className="mb-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            Comment devenir FA
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">1.</strong> Choisissez un
              refuge partenaire ci-dessous (de préférence proche de chez vous).
            </li>
            <li>
              <strong className="text-foreground">2.</strong> Remplissez le
              formulaire de candidature : capacité, espèces, environnement,
              motivation.
            </li>
            <li>
              <strong className="text-foreground">3.</strong> Le refuge étudie
              votre candidature et revient vers vous par email.
            </li>
            <li>
              <strong className="text-foreground">4.</strong> Une fois validée,
              le refuge vous propose un animal selon vos critères. Vous
              acceptez (ou pas).
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Refuges qui acceptent les candidatures FA
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
                    href={`/familles-accueil/${s.slug}`}
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
  icon: typeof Home;
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
