import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Plus,
  Radio,
  Clock3,
  MapPin,
  PawPrint,
  HeartHandshake,
} from "lucide-react";
import { eq, sql } from "drizzle-orm";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { buttonVariants } from "@shared/ui/button";
import { ReportCard } from "@lost-found/public";
import { ReportMap } from "@lost-found/public";
import { RadiusFilter } from "@lost-found/public";
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
    title: "Animaux perdus & trouvés — Dorloter",
    description:
      "Carte en temps réel des animaux perdus et trouvés. Mise en relation automatique par géolocalisation et description.",
    url: "/perdus-trouves",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Animaux perdus & trouvés — Dorloter",
    description:
      "Signalez et retrouvez les animaux perdus près de chez vous, en quelques secondes.",
  },
};

interface PageProps {
  searchParams: Promise<{
    type?: string;
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
  const { type, lat, lng, radius, since } = await searchParams;
  const filterType =
    type === "perdu" || type === "trouve" ? type : undefined;

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

  const reports = await getReports(
    {
      type: filterType,
      status: "actif",
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
    since?: string | null;
  }): string {
    const params = new URLSearchParams();
    const nextType =
      overrides.type !== undefined ? overrides.type : filterType;
    if (nextType) params.set("type", nextType);
    const nextSince =
      overrides.since !== undefined ? overrides.since : sinceKey;
    if (nextSince) params.set("since", nextSince);
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
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* Bandeau "temps réel" */}
        <section className="mb-8 rounded-lg border-l-4 border-prune-600 bg-prune-50/60 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-prune-800">
                <Radio className="h-3 w-3 animate-pulse" />
                Fil d&apos;alertes en temps réel
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Animaux perdus &amp; trouvés
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
                <span>
                  <strong className="font-semibold text-prune-700">
                    {perdus}
                  </strong>{" "}
                  perdu{perdus > 1 ? "s" : ""}
                </span>
                <span className="text-sable-300">·</span>
                <span>
                  <strong className="font-semibold text-lavande-700">
                    {trouves}
                  </strong>{" "}
                  trouvé{trouves > 1 ? "s" : ""}
                </span>
                {lastAt && (
                  <>
                    <span className="text-sable-300">·</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      Dernière annonce {timeSince(lastAt)}
                    </span>
                  </>
                )}
                {hasGeo && (
                  <>
                    <span className="text-sable-300">·</span>
                    <span className="text-xs text-muted-foreground">
                      filtré à {radiusN} km de vous
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/perdus-trouves/retrouvailles"
                className={buttonVariants({ variant: "outline" })}
              >
                <HeartHandshake className="mr-2 h-4 w-4" />
                Retrouvailles
              </Link>
              <Link href="/signaler" className={buttonVariants()}>
                <Plus className="mr-2 h-4 w-4" />
                Signaler vite
              </Link>
            </div>
          </div>
        </section>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Type
          </span>
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
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Récence
          </span>
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
        </div>

        <div className="mb-8">
          <RadiusFilter
            initialLat={latN}
            initialLng={lngN}
            initialRadiusKm={radiusN}
          />
        </div>

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
                : "Tant mieux — c'est le silence qu'on aime sur cette page. Si vous avez perdu ou trouvé un animal, signalez-le."
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
}: {
  href: string;
  active: boolean;
  label: string;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-coral-500 text-white"
          : "border border-border bg-card text-foreground hover:border-coral-300"
      }`}
    >
      {dot && (
        <span
          className={`h-2 w-2 rounded-full ${dot} ${active ? "opacity-70" : ""}`}
        />
      )}
      {label}
    </Link>
  );
}
