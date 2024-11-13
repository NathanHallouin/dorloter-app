import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Heart,
  HeartHandshake,
  MapPin,
  Plus,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { EmptyState } from "@shared/ui/empty-state";
import { buttonVariants } from "@shared/ui/button";
import { getRetrouvaillesStats } from "@lost-found/public";
import { cn } from "@shared/utils";

// Stats agrégées — recalculées au plus toutes les 10 min.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Retrouvailles",
  description:
    "Toutes les correspondances confirmées sur Dorloter · animaux retrouvés grâce à la communauté. Stats publiques, anonymisées, mises à jour en continu.",
  alternates: { canonical: "/perdus-trouves/retrouvailles" },
  openGraph: {
    title: "Retrouvailles · Dorloter",
    description:
      "Le compteur des familles réunies grâce à Dorloter. Une histoire de quartier, multipliée par mille.",
    url: "/perdus-trouves/retrouvailles",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Retrouvailles · Dorloter",
    description:
      "Toutes les retrouvailles facilitées sur Dorloter, en chiffres et en visages.",
  },
};

const MONTH_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatMonthKey(key: string): string {
  const [year, month] = key.split("-");
  const m = Number(month) - 1;
  return `${MONTH_LABELS[m] ?? ""} ${year?.slice(2) ?? ""}`;
}

function timeSince(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 3600) return "il y a moins d'une heure";
  if (sec < 86400) return `il y a ${Math.floor(sec / 3600)} h`;
  const days = Math.floor(sec / 86400);
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? "s" : ""}`;
}

export default async function RetrouvaillesPage() {
  const stats = await getRetrouvaillesStats();
  const max = stats.monthlyHistogram.reduce(
    (m, r) => Math.max(m, r.count),
    0
  );

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-sable-200 bg-linear-to-br from-coral-50 via-white to-lavande-50 px-4 py-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-coral-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-lavande-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-6xl">
            <Link
              href="/perdus-trouves"
              className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour aux signalements
            </Link>

            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700 shadow-sm ring-1 ring-coral-200/60">
              <HeartHandshake className="h-3 w-3" />
              Tableau de bord public
            </p>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
              {stats.total > 0 ? (
                <>
                  <span className="bg-linear-to-r from-coral-500 to-coral-400 bg-clip-text text-transparent tabular-nums">
                    {stats.total.toLocaleString("fr-FR")}
                  </span>{" "}
                  retrouvaille{stats.total > 1 ? "s" : ""}
                </>
              ) : (
                <>
                  Bientôt, des
                  <br />
                  <span className="bg-linear-to-r from-coral-500 to-coral-400 bg-clip-text text-transparent">
                    retrouvailles
                  </span>
                </>
              )}
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              {stats.total > 0
                ? "Familles réunies grâce à la communauté Dorloter · chaque chiffre est une histoire, parfois après des semaines d'attente."
                : "Personne n'a encore confirmé de correspondance ici. La première peut arriver à tout moment · un voisin qui scrolle, un signalement bien rempli, une carte qui s'affine."}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:max-w-2xl">
              <StatTile
                value={stats.thisMonth}
                label="ce mois-ci"
                accent="text-coral-700"
              />
              <StatTile
                value={stats.thisYear}
                label="cette année"
                accent="text-lavande-700"
              />
              <StatTile
                value={stats.total}
                label="depuis le lancement"
                accent="text-prune-700"
              />
            </div>
          </div>
        </section>

        {/* Histogramme 12 mois */}
        <section className="border-b border-sable-200 bg-white px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
                  Tendance
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  12 derniers mois
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.total === 0
                  ? "Le graphique s'animera dès la première confirmation."
                  : `Total cumulé : ${stats.total.toLocaleString("fr-FR")}`}
              </p>
            </div>

            {stats.monthlyHistogram.length === 0 ? (
              <EmptyState
                variant="inline"
                title="Pas encore de données"
                hint="Le système attend la première correspondance confirmée."
              />
            ) : (
              <div className="flex h-48 items-end gap-2 overflow-x-auto pb-3">
                {stats.monthlyHistogram.map((row) => {
                  const heightPct = max === 0 ? 0 : (row.count / max) * 100;
                  return (
                    <div
                      key={row.monthKey}
                      className="flex min-w-12 flex-1 flex-col items-center gap-2"
                    >
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {row.count}
                      </span>
                      <div
                        className={cn(
                          "w-full rounded-t-md bg-linear-to-t from-coral-500 to-coral-400 transition-all",
                          row.count === 0 && "from-sable-200 to-sable-200"
                        )}
                        style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          minHeight: "8px",
                        }}
                        aria-hidden
                      />
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
                        {formatMonthKey(row.monthKey)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Mur des retrouvailles récentes */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
                Le mur
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Les dernières familles réunies
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Anonymisé · on ne montre que la photo et le prénom (s&apos;il
                était renseigné). Les fiches sont marquées résolues.
              </p>
            </div>

            {stats.recent.length === 0 ? (
              <EmptyState
                variant="illustrated"
                icon={<Sparkles className="h-9 w-9" />}
                title="Pas encore de retrouvailles à afficher"
                hint="Les correspondances confirmées s'afficheront ici, anonymisées. La communauté se construit petit à petit."
                action={
                  <Link href="/signaler" className={buttonVariants()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Signaler un animal
                  </Link>
                }
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.recent.map((r) => (
                  <li key={r.matchId}>
                    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <div className="grid grid-cols-2">
                        <Photo
                          src={r.perdu.photoUrl}
                          alt="Avant"
                          tag="Perdu"
                          tagColor="bg-prune-600"
                        />
                        <Photo
                          src={r.trouve.photoUrl}
                          alt="Après"
                          tag="Trouvé"
                          tagColor="bg-lavande-600"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold text-foreground">
                            {r.perdu.petName ??
                              (r.perdu.species === "chat"
                                ? "Un chat"
                                : "Un chien")}{" "}
                            est rentré 💛
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {timeSince(r.confirmedAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Heart
                              className="h-3 w-3 text-coral-500"
                              fill="currentColor"
                            />
                            Score {r.score}/100
                          </span>
                          {r.distanceKm !== null && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {r.distanceKm < 1
                                ? `${Math.round(r.distanceKm * 1000)} m`
                                : `${r.distanceKm} km`}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* CTA bottom */}
        <section className="border-t border-sable-200 bg-sable-50/40 px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Aidez la prochaine retrouvaille
            </h2>
            <p className="mt-3 text-muted-foreground">
              Plus il y a de signalements bien remplis dans une zone, plus le
              système peut faire le lien. Si vous avez perdu ou trouvé un
              animal, ne tardez pas · chaque heure compte.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/signaler"
                className={buttonVariants({ size: "lg" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Signaler un animal
              </Link>
              <Link
                href="/perdus-trouves"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Voir la carte des signalements
              </Link>
            </div>
          </div>
        </section>
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
    <div className="rounded-xl border border-border bg-white/80 p-4 backdrop-blur">
      <div className={`text-3xl font-bold tabular-nums ${accent}`}>
        {value.toLocaleString("fr-FR")}
      </div>
      <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Photo({
  src,
  alt,
  tag,
  tagColor,
}: {
  src: string | null;
  alt: string;
  tag: string;
  tagColor: string;
}) {
  return (
    <div className="relative aspect-square bg-sable-100">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, 200px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-3xl">
          🐈
        </div>
      )}
      <span
        className={cn(
          "absolute left-2 top-2 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white",
          tagColor
        )}
      >
        {tag}
      </span>
    </div>
  );
}
