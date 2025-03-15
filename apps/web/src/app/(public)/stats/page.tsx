import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  PawPrint,
  Home,
  HeartHandshake,
  Search,
  Hotel,
  Stethoscope,
  Cat,
  Dog,
  TrendingUp,
  Map as MapIcon,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getGlobalAdoptionStats } from "@adoption/public";
import {
  getGlobalShelterStats,
  type GlobalShelterStats,
} from "@shelters/public";
import { getGlobalPensionStats } from "@pensions/public";
import { getGlobalVetStats } from "@veterinarians/public";
import {
  getGlobalReportStats,
  getRetrouvaillesStats,
} from "@lost-found/public";

export const metadata: Metadata = {
  title: "Les chiffres",
  description:
    "Tableaux de bord public Dorloter : animaux à adopter, refuges partenaires, retrouvailles confirmées et écosystème français. Données temps réel.",
  alternates: { canonical: "/stats" },
  openGraph: {
    title: "Les chiffres Dorloter · transparence temps réel",
    description:
      "Suivez en direct l'activité de la plateforme : adoptions, retrouvailles, refuges partenaires.",
    type: "website",
  },
};

interface AllStats {
  adoption: Awaited<ReturnType<typeof getGlobalAdoptionStats>>;
  shelters: GlobalShelterStats;
  pensions: Awaited<ReturnType<typeof getGlobalPensionStats>>;
  vets: Awaited<ReturnType<typeof getGlobalVetStats>>;
  reports: Awaited<ReturnType<typeof getGlobalReportStats>>;
  retrouvailles: Awaited<ReturnType<typeof getRetrouvaillesStats>>;
}

const FALLBACK_STATS: AllStats = {
  adoption: {
    available: 0,
    cats: 0,
    dogs: 0,
    adoptedTotal: 0,
    adoptedThisMonth: 0,
  },
  shelters: { total: 0, verified: 0 },
  pensions: { verified: 0, cats: 0, dogs: 0 },
  vets: { total: 0, verified: 0, emergencies: 0 },
  reports: {
    active: 0,
    perdus: 0,
    trouves: 0,
    resolvedTotal: 0,
    resolvedThisMonth: 0,
  },
  retrouvailles: {
    total: 0,
    thisMonth: 0,
    thisYear: 0,
    monthlyHistogram: [],
    recent: [],
  },
};

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[stats] ${label} failed, using fallback`, err);
    return fallback;
  }
}

const loadAllStats = unstable_cache(
  async (): Promise<AllStats> => {
    // Séquentiel plutôt que Promise.all : limite la pression sur le
    // transaction pooler Supabase et évite les statement_timeout en
    // cascade. Chaque appel est isolé par safe() — un échec ne casse
    // pas la page.
    const adoption = await safe(
      () => getGlobalAdoptionStats(),
      FALLBACK_STATS.adoption,
      "adoption"
    );
    const shelters = await safe(
      () => getGlobalShelterStats(),
      FALLBACK_STATS.shelters,
      "shelters"
    );
    const pensions = await safe(
      () => getGlobalPensionStats(),
      FALLBACK_STATS.pensions,
      "pensions"
    );
    const vets = await safe(
      () => getGlobalVetStats(),
      FALLBACK_STATS.vets,
      "vets"
    );
    const reports = await safe(
      () => getGlobalReportStats(),
      FALLBACK_STATS.reports,
      "reports"
    );
    const retrouvailles = await safe(
      () => getRetrouvaillesStats(),
      FALLBACK_STATS.retrouvailles,
      "retrouvailles"
    );
    return { adoption, shelters, pensions, vets, reports, retrouvailles };
  },
  ["public-stats-aggregate-v2"],
  { revalidate: 3600, tags: ["public-stats"] }
);

export default async function StatsPage() {
  const stats = await loadAllStats();
  const { adoption, shelters, pensions, vets, reports, retrouvailles } = stats;

  const histogramMax = Math.max(
    1,
    ...retrouvailles.monthlyHistogram.map((m) => m.count)
  );

  return (
    <>
      <Navbar />
      <main id="main" className="w-full flex-1 px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <header className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-600">
              Transparence
            </p>
            <h1 className="mt-2 text-4xl font-extrabold text-foreground sm:text-5xl">
              Les chiffres Dorloter
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Toutes les données sont issues de notre base de production, mises
              à jour en temps réel. Rien n&apos;est arrondi, rien n&apos;est
              gonflé.
            </p>
          </header>

          {/* Métriques principales */}
          <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={PawPrint}
              accent="coral"
              value={adoption.available}
              label="Animaux à adopter"
              detail={
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Cat className="h-3 w-3" />
                    {adoption.cats}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Dog className="h-3 w-3" />
                    {adoption.dogs}
                  </span>
                </span>
              }
              href="/adopter"
            />
            <MetricCard
              icon={Home}
              accent="ambre"
              value={shelters.verified}
              label="Refuges vérifiés"
              detail={
                shelters.total > shelters.verified
                  ? `${shelters.total - shelters.verified} en attente`
                  : "Tous validés"
              }
              href="/refuges"
            />
            <MetricCard
              icon={HeartHandshake}
              accent="prune"
              value={adoption.adoptedTotal}
              label="Adoptions facilitées"
              detail={
                adoption.adoptedThisMonth > 0
                  ? `+${adoption.adoptedThisMonth} ce mois`
                  : "Cumul depuis le lancement"
              }
            />
            <MetricCard
              icon={Search}
              accent="lavande"
              value={retrouvailles.total}
              label="Retrouvailles confirmées"
              detail={
                retrouvailles.thisMonth > 0
                  ? `+${retrouvailles.thisMonth} ce mois`
                  : "Algorithme de matching géo"
              }
              href="/perdus-trouves/retrouvailles"
            />
          </section>

          {/* Histogramme retrouvailles 12 mois */}
          <section className="mb-12 rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-xl font-bold text-foreground">
                  <TrendingUp className="h-5 w-5 text-coral-500" />
                  Retrouvailles sur 12 mois
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Animaux perdus rapprochés à un signalement &laquo; trouvé
                  &raquo; grâce à notre algorithme.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">
                  {retrouvailles.thisYear}
                </strong>{" "}
                cette année
              </p>
            </div>
            <Histogram
              data={retrouvailles.monthlyHistogram}
              max={histogramMax}
            />
          </section>

          {/* Écosystème */}
          <section className="mb-12">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Écosystème souverain
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <EcosystemCard
                icon={Hotel}
                color="text-amber-600"
                bg="bg-amber-50"
                value={pensions.verified}
                label="Pensions agréées"
                sublabel={`${pensions.cats} acceptent les chats · ${pensions.dogs} les chiens`}
                href="/pensions"
              />
              <EcosystemCard
                icon={Stethoscope}
                color="text-blue-600"
                bg="bg-blue-50"
                value={vets.verified}
                label="Cabinets vétérinaires"
                sublabel={
                  vets.emergencies > 0
                    ? `dont ${vets.emergencies} urgences 24/7`
                    : "Réseau vérifié ONV"
                }
                href="/veterinaires"
              />
              <EcosystemCard
                icon={Home}
                color="text-coral-600"
                bg="bg-coral-50"
                value={shelters.total}
                label="Refuges référencés"
                sublabel={`${shelters.verified} validés à ce jour`}
                href="/refuges"
              />
            </div>
          </section>

          {/* Signalements actifs */}
          <section className="mb-12 rounded-2xl border border-border bg-gradient-to-br from-sable-50 to-coral-50/40 p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Signalements perdus / trouvés en ce moment
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <ActiveStat
                value={reports.perdus}
                label="Animaux perdus"
                color="text-prune-700"
                bg="bg-prune-50"
              />
              <ActiveStat
                value={reports.trouves}
                label="Animaux trouvés"
                color="text-lavande-700"
                bg="bg-lavande-50"
              />
              <ActiveStat
                value={reports.resolvedTotal}
                label="Cas résolus au total"
                color="text-coral-700"
                bg="bg-coral-50"
              />
            </div>
            <Link
              href="/carte"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-coral-600 hover:underline"
            >
              <MapIcon className="h-4 w-4" />
              Voir tous les acteurs sur la carte
            </Link>
          </section>

          {/* Footer transparence */}
          <section className="rounded-xl border border-dashed border-border bg-card/50 p-5 text-center">
            <p className="text-xs text-muted-foreground">
              Données rafraîchies toutes les heures depuis notre base PostgreSQL
              hébergée en France. Aucune métrique n&apos;est inventée ou
              extrapolée. Si un chiffre vous semble incohérent, écrivez à{" "}
              <a
                href="mailto:contact@dorloter.fr"
                className="font-medium text-coral-600 hover:underline"
              >
                contact@dorloter.fr
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Composants internes ───────────────────────────────────────────────────

const ACCENT_STYLES: Record<
  string,
  { ring: string; bg: string; text: string }
> = {
  coral: {
    ring: "ring-coral-100",
    bg: "bg-coral-50",
    text: "text-coral-600",
  },
  ambre: {
    ring: "ring-amber-100",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  prune: {
    ring: "ring-prune-100",
    bg: "bg-prune-50",
    text: "text-prune-700",
  },
  lavande: {
    ring: "ring-lavande-100",
    bg: "bg-lavande-50",
    text: "text-lavande-700",
  },
};

function MetricCard({
  icon: Icon,
  accent,
  value,
  label,
  detail,
  href,
}: {
  icon: typeof PawPrint;
  accent: keyof typeof ACCENT_STYLES;
  value: number;
  label: string;
  detail?: React.ReactNode;
  href?: string;
}) {
  const styles = ACCENT_STYLES[accent] ?? ACCENT_STYLES.coral!;
  const card = (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:border-coral-300/60 hover:shadow-md`}
    >
      <span
        aria-hidden="true"
        className={`absolute -right-3 -top-3 h-16 w-16 rounded-full ${styles.bg} opacity-50 transition-transform group-hover:scale-110`}
      />
      <Icon
        className={`relative h-7 w-7 ${styles.text}`}
        strokeWidth={1.75}
      />
      <p className="relative mt-3 text-4xl font-extrabold tabular-nums text-foreground">
        {formatNumber(value)}
      </p>
      <p className="relative mt-1 text-sm font-medium text-foreground">
        {label}
      </p>
      {detail !== undefined && (
        <div className="relative mt-2 text-xs text-muted-foreground">
          {detail}
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}

function EcosystemCard({
  icon: Icon,
  color,
  bg,
  value,
  label,
  sublabel,
  href,
}: {
  icon: typeof Hotel;
  color: string;
  bg: string;
  value: number;
  label: string;
  sublabel: string;
  href?: string;
}) {
  const inner = (
    <div className="flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-coral-300/60">
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}
      >
        <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tabular-nums text-foreground">
          {formatNumber(value)}
        </p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ActiveStat({
  value,
  label,
  color,
  bg,
}: {
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      className={`rounded-xl ${bg} p-4 text-center ring-1 ring-inset ring-white/40`}
    >
      <p className={`text-3xl font-extrabold tabular-nums ${color}`}>
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
    </div>
  );
}

function Histogram({
  data,
  max,
}: {
  data: Array<{ monthKey: string; count: number }>;
  max: number;
}) {
  // Remplit les 12 derniers mois avec 0 si pas de data, en respectant la
  // continuité temporelle. On reconstruit la séquence côté client (le helper
  // ne renvoie que les mois avec activité).
  const filled = fill12Months(data);

  return (
    <div className="flex h-40 items-end gap-1.5">
      {filled.map((m) => {
        const heightPct = max > 0 ? (m.count / max) * 100 : 0;
        return (
          <div
            key={m.monthKey}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div
              className="relative w-full overflow-hidden rounded-t bg-coral-500/80 transition-all hover:bg-coral-600"
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              aria-label={`${m.count} retrouvailles en ${formatMonthLabel(m.monthKey)}`}
            >
              {m.count > 0 && heightPct > 25 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                  {m.count}
                </span>
              )}
            </div>
            <span className="text-[10px] uppercase text-muted-foreground">
              {formatMonthLabel(m.monthKey).slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function fill12Months(
  data: Array<{ monthKey: string; count: number }>
): Array<{ monthKey: string; count: number }> {
  const map = new Map(data.map((d) => [d.monthKey, d.count]));
  const result: Array<{ monthKey: string; count: number }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ monthKey: key, count: map.get(key) ?? 0 });
  }
  return result;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long" });
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
