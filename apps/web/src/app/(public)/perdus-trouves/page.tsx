import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Plus,
  Clock3,
  MapPin,
  PawPrint,
  HeartHandshake,
  SlidersHorizontal,
  Tag,
  X,
  Cat,
  Dog,
  Search,
  Microchip,
  Mars,
  Venus,
} from "lucide-react";
import { Input } from "@shared/ui/input";
import { eq, sql } from "drizzle-orm";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { buttonVariants } from "@shared/ui/button";
import { ReportCard } from "@lost-found/public";
import { ReportMap } from "@lost-found/public";
import { RadiusFilter } from "@lost-found/public";
import { SaveSearchButton } from "@identity/public.client";
import { db } from "@infra/db";
import { reports as reportsTable } from "@/server/db/schema";
import {
  getReports,
  getPrimaryPhotosForReports,
} from "@lost-found/public";

export const metadata: Metadata = {
  title: "Animaux perdus & trouvés",
  description:
    "Signalez un chat ou un chien perdu ou trouvé. Notre système géolocalisé rapproche automatiquement les signalements et alerte les voisins par notification.",
  alternates: { canonical: "/perdus-trouves" },
  openGraph: {
    title: "Animaux perdus & trouvés · Dorloter",
    description:
      "Carte en temps réel des animaux perdus et trouvés. Mise en relation automatique par géolocalisation et description.",
    url: "/perdus-trouves",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Animaux perdus & trouvés · Dorloter",
    description:
      "Signalez et retrouvez les animaux perdus près de chez vous, en quelques secondes.",
  },
};

interface PageProps {
  searchParams: Promise<{
    type?: string;
    species?: string;
    sex?: string;
    chipped?: string;
    q?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    since?: string;
  }>;
}

const SINCE_OPTIONS: Record<string, number> = {
  "24h": 1,
  "7j": 7,
  "30j": 30,
};

export default async function PerdusTrouvesPage({ searchParams }: PageProps) {
  const { type, species, sex, chipped, q, lat, lng, radius, since } =
    await searchParams;
  const filterType =
    type === "perdu" || type === "trouve" ? type : undefined;
  const filterSpecies =
    species === "chat" || species === "chien" ? species : undefined;
  const filterSex = sex === "male" || sex === "femelle" ? sex : undefined;
  const filterChipped =
    chipped === "1" ? true : chipped === "0" ? false : undefined;
  const search = q?.trim() || undefined;

  const latN = lat ? Number(lat) : undefined;
  const lngN = lng ? Number(lng) : undefined;
  const radiusN = radius ? Math.min(200, Math.max(1, Number(radius))) : undefined;
  const hasGeo =
    latN !== undefined &&
    lngN !== undefined &&
    radiusN !== undefined &&
    !Number.isNaN(latN) &&
    !Number.isNaN(lngN);

  const sinceKey = since && since in SINCE_OPTIONS ? since : undefined;
  const sinceDays = sinceKey ? SINCE_OPTIONS[sinceKey] : undefined;

  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  const reports = await getReports(
    {
      type: filterType,
      status: "actif",
      ...(filterSpecies ? { species: filterSpecies } : {}),
      ...(filterSex ? { sex: filterSex } : {}),
      ...(filterChipped !== undefined ? { chipped: filterChipped } : {}),
      ...(search ? { search } : {}),
      ...(hasGeo
        ? { centerLat: latN, centerLng: lngN, radiusKm: radiusN }
        : {}),
      ...(sinceDays !== undefined ? { sinceDays } : {}),
    },
    60
  );
  const photoMap = await getPrimaryPhotosForReports(reports.map((r) => r.id));

  // Comptes par type + dernière activité pour le bandeau "temps réel"
  const [typeStats] = await db
    .select({
      perdus: sql<number>`count(*) filter (where type = 'perdu')`,
      trouves: sql<number>`count(*) filter (where type = 'trouve')`,
      lastAt: sql<Date | null>`max(created_at)`,
    })
    .from(reportsTable)
    .where(eq(reportsTable.status, "actif"));
  const perdus = Number(typeStats?.perdus ?? 0);
  const trouves = Number(typeStats?.trouves ?? 0);
  const lastAt = typeStats?.lastAt ?? null;

  const typeFilterBase = "/perdus-trouves";

  function buildQuery(overrides: {
    type?: string | null;
    species?: string | null;
    sex?: string | null;
    chipped?: string | null;
    since?: string | null;
  }): string {
    const params = new URLSearchParams();
    const pick = (
      key: keyof typeof overrides,
      current: string | undefined
    ) => (overrides[key] !== undefined ? overrides[key] : current);
    const nextType = pick("type", filterType);
    if (nextType) params.set("type", nextType);
    const nextSpecies = pick("species", filterSpecies);
    if (nextSpecies) params.set("species", nextSpecies);
    const nextSex = pick("sex", filterSex);
    if (nextSex) params.set("sex", nextSex);
    const nextChipped = pick(
      "chipped",
      filterChipped === true ? "1" : filterChipped === false ? "0" : undefined
    );
    if (nextChipped) params.set("chipped", nextChipped);
    const nextSince = pick("since", sinceKey);
    if (nextSince) params.set("since", nextSince);
    if (search) params.set("q", search);
    if (hasGeo) {
      params.set("lat", String(latN));
      params.set("lng", String(lngN));
      params.set("radius", String(radiusN));
    }
    const qs = params.toString();
    return qs ? `${typeFilterBase}?${qs}` : typeFilterBase;
  }

  return (
    <>
      <Navbar />
      <main
        id="main"
        className="w-full flex-1 px-4 py-8 md:px-6 lg:px-8"
      >
        {/* Header */}
        <header className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-xs shadow-sable-900/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-coral-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-400/75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-coral-500" />
                </span>
                Fil d&apos;alertes en temps réel
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Animaux perdus &amp; trouvés
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Signalements géolocalisés et mise en relation automatique.
                Plus la communauté est active, plus on retrouve d&apos;animaux.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatPill
                  count={perdus}
                  label={`perdu${perdus > 1 ? "s" : ""}`}
                  accent="prune"
                />
                <StatPill
                  count={trouves}
                  label={`trouvé${trouves > 1 ? "s" : ""}`}
                  accent="lavande"
                />
                {lastAt && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-sable-50 px-2.5 py-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Dernière annonce {timeSince(lastAt)}
                  </span>
                )}
                {hasGeo && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-coral-200 bg-coral-50/50 px-2.5 py-1 text-xs text-coral-700">
                    <MapPin className="h-3 w-3" />
                    Filtré à {radiusN} km
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <SaveSearchButton
                kind="lost-found"
                isSignedIn={!!session}
                whitelist={[
                  "type",
                  "species",
                  "sex",
                  "chipped",
                  "q",
                  "lat",
                  "lng",
                  "radius",
                  "since",
                ]}
                defaultName="Veille perdus / trouvés"
                label="Recevoir une alerte"
              />
              <Link
                href="/perdus-trouves/retrouvailles"
                className={buttonVariants({ variant: "outline" })}
              >
                <HeartHandshake className="mr-1.5 h-4 w-4" />
                Retrouvailles
              </Link>
              <Link href="/signaler" className={buttonVariants()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Signaler vite
              </Link>
            </div>
          </div>
        </header>

        {/* Filtres */}
        <FilterPanel
          resultsCount={reports.length}
          activeFiltersCount={
            (filterType ? 1 : 0) +
            (filterSpecies ? 1 : 0) +
            (filterSex ? 1 : 0) +
            (filterChipped !== undefined ? 1 : 0) +
            (search ? 1 : 0) +
            (sinceKey ? 1 : 0) +
            (hasGeo ? 1 : 0)
          }
          searchInput={
            <SearchForm
              defaultValue={search ?? ""}
              hiddenParams={{
                ...(filterType ? { type: filterType } : {}),
                ...(filterSpecies ? { species: filterSpecies } : {}),
                ...(filterSex ? { sex: filterSex } : {}),
                ...(filterChipped !== undefined
                  ? { chipped: filterChipped ? "1" : "0" }
                  : {}),
                ...(sinceKey ? { since: sinceKey } : {}),
                ...(hasGeo
                  ? {
                      lat: String(latN),
                      lng: String(lngN),
                      radius: String(radiusN),
                    }
                  : {}),
              }}
            />
          }
        >
          <FilterGroup label="Type" icon={<Tag className="h-3.5 w-3.5" />}>
            <FilterChip
              href={buildQuery({ type: null })}
              active={!filterType}
              label="Tous"
            />
            <FilterChip
              href={buildQuery({ type: "perdu" })}
              active={filterType === "perdu"}
              label="Perdus"
              dot="bg-prune-600"
            />
            <FilterChip
              href={buildQuery({ type: "trouve" })}
              active={filterType === "trouve"}
              label="Trouvés"
              dot="bg-lavande-600"
            />
          </FilterGroup>

          <FilterGroup
            label="Espèce"
            icon={<PawPrint className="h-3.5 w-3.5" />}
          >
            <FilterChip
              href={buildQuery({ species: null })}
              active={!filterSpecies}
              label="Toutes"
            />
            <FilterChip
              href={buildQuery({ species: "chat" })}
              active={filterSpecies === "chat"}
              label="Chats"
              leadingIcon={<Cat className="h-3.5 w-3.5" />}
            />
            <FilterChip
              href={buildQuery({ species: "chien" })}
              active={filterSpecies === "chien"}
              label="Chiens"
              leadingIcon={<Dog className="h-3.5 w-3.5" />}
            />
          </FilterGroup>

          <FilterGroup label="Sexe" icon={<Venus className="h-3.5 w-3.5" />}>
            <FilterChip
              href={buildQuery({ sex: null })}
              active={!filterSex}
              label="Tous"
            />
            <FilterChip
              href={buildQuery({ sex: "male" })}
              active={filterSex === "male"}
              label="Mâle"
              leadingIcon={<Mars className="h-3.5 w-3.5" />}
            />
            <FilterChip
              href={buildQuery({ sex: "femelle" })}
              active={filterSex === "femelle"}
              label="Femelle"
              leadingIcon={<Venus className="h-3.5 w-3.5" />}
            />
          </FilterGroup>

          <FilterGroup
            label="Puce"
            icon={<Microchip className="h-3.5 w-3.5" />}
          >
            <FilterChip
              href={buildQuery({ chipped: null })}
              active={filterChipped === undefined}
              label="Indifférent"
            />
            <FilterChip
              href={buildQuery({ chipped: "1" })}
              active={filterChipped === true}
              label="Pucé"
            />
            <FilterChip
              href={buildQuery({ chipped: "0" })}
              active={filterChipped === false}
              label="Non pucé"
            />
          </FilterGroup>

          <FilterGroup
            label="Récence"
            icon={<Clock3 className="h-3.5 w-3.5" />}
          >
            <FilterChip
              href={buildQuery({ since: null })}
              active={!sinceKey}
              label="Tout"
            />
            <FilterChip
              href={buildQuery({ since: "24h" })}
              active={sinceKey === "24h"}
              label="24 h"
            />
            <FilterChip
              href={buildQuery({ since: "7j" })}
              active={sinceKey === "7j"}
              label="7 jours"
            />
            <FilterChip
              href={buildQuery({ since: "30j" })}
              active={sinceKey === "30j"}
              label="30 jours"
            />
          </FilterGroup>

          <FilterGroup
            label="Zone"
            icon={<MapPin className="h-3.5 w-3.5" />}
            badge={hasGeo ? `${radiusN} km` : undefined}
          >
            <RadiusFilter
              initialLat={latN}
              initialLng={lngN}
              initialRadiusKm={radiusN}
            />
          </FilterGroup>
        </FilterPanel>

        {reports.length === 0 ? (
          <EmptyState
            variant="illustrated"
            icon={
              hasGeo ? (
                <MapPin className="h-9 w-9" />
              ) : (
                <PawPrint className="h-9 w-9" />
              )
            }
            title={
              hasGeo
                ? "Rien dans cette zone pour le moment"
                : "Aucun signalement actif"
            }
            hint={
              hasGeo
                ? "Essayez d'élargir le rayon, ou revenez plus tard. Les signalements arrivent souvent par vagues."
                : "Tant mieux · c'est le silence qu'on aime sur cette page. Si vous avez perdu ou trouvé un animal, signalez-le."
            }
            action={
              <Link
                href="/signaler"
                className={buttonVariants({ variant: "outline" })}
              >
                Créer un signalement
              </Link>
            }
          />
        ) : (
          <>
            <section className="mb-8">
              <ReportMap reports={reports} />
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-prune-600 ring-2 ring-white" />
                  Animal perdu
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-lavande-600 ring-2 ring-white" />
                  Animal trouvé
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-coral-500 ring-2 ring-white" />
                  Zone (cliquer pour zoomer)
                </span>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  primaryPhoto={photoMap.get(report.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function timeSince(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "à l'instant";
  if (sec < 3600) return `il y a ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `il y a ${Math.floor(sec / 3600)} h`;
  const days = Math.floor(sec / 86400);
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

function FilterChip({
  href,
  active,
  label,
  dot,
  leadingIcon,
}: {
  href: string;
  active: boolean;
  label: string;
  dot?: string;
  leadingIcon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-coral-500 text-white shadow-sm shadow-coral-500/20"
          : "border border-border bg-card text-foreground hover:border-coral-300 hover:bg-sable-50/70"
      }`}
    >
      {dot && (
        <span
          className={`h-2 w-2 rounded-full ${dot} ${active ? "opacity-70" : ""}`}
        />
      )}
      {leadingIcon && (
        <span
          className={
            active ? "text-white" : "text-muted-foreground"
          }
        >
          {leadingIcon}
        </span>
      )}
      {label}
    </Link>
  );
}

function SearchForm({
  defaultValue,
  hiddenParams,
}: {
  defaultValue: string;
  hiddenParams: Record<string, string>;
}) {
  return (
    <form
      method="get"
      action="/perdus-trouves"
      className="relative flex w-full items-center"
    >
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Nom, race, couleur, ville, mots-clés…"
        className="pl-9"
      />
      {Object.entries(hiddenParams).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="sr-only">
        Rechercher
      </button>
    </form>
  );
}

function FilterPanel({
  resultsCount,
  activeFiltersCount,
  searchInput,
  children,
}: {
  resultsCount: number;
  activeFiltersCount: number;
  searchInput?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label="Filtres et résultats"
      className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-xs shadow-sable-900/[0.03]"
    >
      {/* Bandeau horizontal : recherche large + compteur + reset */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-sable-50/40 px-4 py-2.5">
        <div className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Filtres
          </span>
          {activeFiltersCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral-500 px-1.5 text-[10px] font-bold tabular-nums text-white">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {searchInput && (
          <div className="min-w-[200px] flex-1">{searchInput}</div>
        )}
        <div className="inline-flex items-center gap-3 text-xs">
          <span className="tabular-nums text-muted-foreground">
            <strong className="font-semibold text-foreground">
              {resultsCount}
            </strong>{" "}
            résultat{resultsCount > 1 ? "s" : ""}
          </span>
          {activeFiltersCount > 0 && (
            <Link
              href="/perdus-trouves"
              className="inline-flex items-center gap-1 rounded-full text-coral-700 transition-colors hover:text-coral-800"
            >
              <X className="h-3 w-3" />
              Réinitialiser
            </Link>
          )}
        </div>
      </div>

      {/* Bandeau horizontal : tous les filtres inline en flex-wrap */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        {children}
      </div>
    </section>
  );
}

function FilterGroup({
  label,
  icon,
  badge,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 border-r border-border/60 pr-4 last:border-r-0 last:pr-0">
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      {badge && (
        <span className="inline-flex items-center gap-1 rounded-full border border-coral-200 bg-coral-50 px-2 py-0.5 text-[10px] font-semibold text-coral-700">
          {badge}
        </span>
      )}
    </div>
  );
}

function StatPill({
  count,
  label,
  accent,
}: {
  count: number;
  label: string;
  accent: "prune" | "lavande";
}) {
  const styles = {
    prune: "border-prune-200 bg-prune-50 text-prune-800",
    lavande: "border-lavande-200 bg-lavande-50 text-lavande-800",
  } as const;
  const dot = {
    prune: "bg-prune-600",
    lavande: "bg-lavande-600",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${styles[accent]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[accent]}`} />
      <strong className="font-semibold tabular-nums">{count}</strong>
      <span className="text-xs opacity-80">{label}</span>
    </span>
  );
}
