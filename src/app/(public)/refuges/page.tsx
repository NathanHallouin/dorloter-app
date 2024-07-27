import { EmptyState } from "@shared/ui/empty-state";
import { VerifiedBadge } from "@shared/ui/verified-badge";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, MapPin, Heart, PawPrint } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getSheltersWithStats } from "@shelters/public";
import { placeholderCovers } from "@shared/utils/placeholder-images";

export const metadata: Metadata = {
  title: "Les refuges qui font Dorloter",
  description:
    "Refuges et associations partenaires : les équipes qui recueillent, soignent et placent les animaux. Parcourez leurs pages, suivez-les, soutenez-les.",
  alternates: { canonical: "/refuges" },
  openGraph: {
    title: "Refuges & associations — Dorloter",
    description:
      "Annuaire des refuges et associations partenaires de Dorloter, partout en France. SIRET vérifié, page publique gratuite.",
    url: "/refuges",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refuges & associations partenaires — Dorloter",
    description:
      "Découvrez les refuges qui prennent soin des animaux abandonnés et leur trouvent un foyer.",
  },
};

type Filter = "tous" | "verifies";

export default async function RefugesPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const params = await searchParams;
  const filter: Filter = params.f === "verifies" ? "verifies" : "tous";

  const all = await getSheltersWithStats();
  const list =
    filter === "verifies" ? all.filter((r) => r.shelter.isVerified) : all;

  const totalAvailable = all.reduce((n, r) => n + r.available, 0);
  const totalAdopted = all.reduce((n, r) => n + r.adopted, 0);
  const verifiedCount = all.filter((r) => r.shelter.isVerified).length;

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {/* Hero éditorial */}
        <section className="border-b border-border bg-linear-to-b from-accent/30 to-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <PawPrint className="h-3.5 w-3.5" />
              Annuaire des refuges
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Derrière chaque chat, il y a une équipe.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Ce sont elles qui sortent les chats de la rue, les soignent, les
              socialisent et les confient à de bonnes familles. Suivez leur
              travail, partagez leurs chats, soutenez-les.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl">
              <StatTile
                value={all.length}
                label="Refuges"
                accent="text-primary"
              />
              <StatTile
                value={totalAvailable}
                label="Animaux à adopter"
                accent="text-coral"
              />
              <StatTile
                value={totalAdopted}
                label="Déjà adoptés"
                accent="text-green-700"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          {/* Filtres */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <FilterPill
                href="/refuges"
                active={filter === "tous"}
                label={`Tous · ${all.length}`}
              />
              <FilterPill
                href="/refuges?f=verifies"
                active={filter === "verifies"}
                label={`Vérifiés · ${verifiedCount}`}
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {list.length} {list.length > 1 ? "refuges" : "refuge"}
            </p>
          </div>

          {list.length === 0 ? (
            <EmptyState
              variant="illustrated"
              icon={<ShieldCheck className="h-9 w-9" />}
              title="Aucun refuge ne correspond à ce filtre"
              hint="Tous les refuges ne sont pas encore vérifiés — repassez bientôt ou parcourez la liste complète."
              action={
                <Link
                  href="/refuges"
                  className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Voir tous les refuges
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map(({ shelter, available, adopted }) => (
                <Link
                  key={shelter.id}
                  href={`/refuges/${shelter.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                    <Image
                      src={shelter.coverUrl || placeholderCovers.shelter}
                      alt={shelter.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

                    {shelter.isVerified && (
                      <div className="absolute right-3 top-3">
                        <VerifiedBadge size="sm" asLink={false} />
                      </div>
                    )}

                    {shelter.logoUrl && (
                      <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
                        <Image
                          src={shelter.logoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    )}

                    {available > 0 && (
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-coral px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                        <Heart className="h-3 w-3" />
                        {available} à adopter
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex flex-1 flex-col p-5 ${shelter.logoUrl ? "pt-8" : "pt-5"}`}
                  >
                    <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                      {shelter.name}
                    </h3>

                    {shelter.address && (
                      <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{shelter.address}</span>
                      </p>
                    )}

                    {shelter.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {shelter.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>
                        <strong className="text-foreground">{available}</strong>{" "}
                        à adopter
                      </span>
                      <span className="h-3 w-px bg-border" />
                      <span>
                        <strong className="text-foreground">{adopted}</strong>{" "}
                        adoptés
                      </span>
                      {shelter.foundedYear && (
                        <>
                          <span className="h-3 w-px bg-border" />
                          <span>depuis {shelter.foundedYear}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* CTA bas de page pour les refuges eux-mêmes */}
          <section className="mt-16 overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/5 via-card to-accent/20 p-8 md:p-10">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
                Vous gérez un refuge ou une association ?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Rejoignez les équipes sur Dorloter : page publique, gestion des
                chats, candidatures, suivi — le tout gratuit, sans commission
                sur les adoptions.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Créer un compte refuge
                </Link>
                <Link
                  href="mailto:hello@dorloter.fr"
                  className="inline-flex items-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Nous écrire
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatTile({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "border border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
