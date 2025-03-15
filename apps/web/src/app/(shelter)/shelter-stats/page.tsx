import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  Clock3,
  Heart,
  Inbox,
  Mail,
  PawPrint,
  TrendingUp,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@shared/ui/button";
import { requireShelter } from "@infra/auth/session";
import {
  getShelterStats,
  getShelterAdvancedStats,
  type HardToPlacePet,
} from "@adoption/public";
import { cn } from "@shared/utils";

export const metadata: Metadata = {
  title: "Statistiques · Refuge",
};

export const revalidate = 600;

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[shelter-stats] ${label} failed`, err);
    return fallback;
  }
}

const FALLBACK_ADVANCED = {
  avgDaysToAdoption: { overall: null, cats: null, dogs: null },
  conversion: {
    applicationsTotal: 0,
    applicationsAccepted: 0,
    rate: 0,
    avgApplicationsPerAdoption: null,
  },
  recent: { applicationsLast30d: 0, adoptionsLast30d: 0 },
  monthlyAdoptions: [],
  bySpecies: {
    chat: { total: 0, available: 0, adopted: 0 },
    chien: { total: 0, available: 0, adopted: 0 },
  },
  hardToPlace: [] as HardToPlacePet[],
  staleApplications: 0,
};

export default async function ShelterStatsPage() {
  const session = await requireShelter();
  const [stats, advanced] = await Promise.all([
    safe(
      () => getShelterStats(session.user.shelterId),
      {
        catsTotal: 0,
        catsAvailable: 0,
        catsReserved: 0,
        catsAdopted: 0,
        applicationsTotal: 0,
        applicationsPending: 0,
        applicationsAccepted: 0,
      },
      "basic"
    ),
    safe(
      () => getShelterAdvancedStats(session.user.shelterId),
      FALLBACK_ADVANCED,
      "advanced"
    ),
  ]);

  const adoptionRate =
    stats.catsTotal > 0
      ? Math.round((stats.catsAdopted / stats.catsTotal) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Statistiques</h1>
        <p className="mt-2 text-muted-foreground">
          Vue d&apos;ensemble de l&apos;activité du refuge, sur 12 mois
          glissants.
        </p>
      </header>

      {/* Bloc 1 : compteurs principaux */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<PawPrint className="h-5 w-5" />}
          label="Animaux publiés"
          value={stats.catsTotal}
          sublabel={`${stats.catsAvailable} disponible${stats.catsAvailable > 1 ? "s" : ""}`}
        />
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          label="Réservés"
          value={stats.catsReserved}
          sublabel="En cours d'adoption"
          accent="coral"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Adoptés"
          value={stats.catsAdopted}
          sublabel={`${adoptionRate}% du total`}
          accent="green"
        />
        <StatCard
          icon={<Mail className="h-5 w-5" />}
          label="Candidatures"
          value={stats.applicationsTotal}
          sublabel={`${stats.applicationsPending} en attente`}
          accent="lavande"
        />
      </section>

      {/* Bloc 2 : KPI avancés */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdvancedKpi
          icon={<Clock3 className="h-4 w-4" />}
          label="Durée moyenne avant adoption"
          value={
            advanced.avgDaysToAdoption.overall !== null
              ? `${advanced.avgDaysToAdoption.overall} j`
              : "à mesurer"
          }
          hint={formatAvgHint(
            advanced.avgDaysToAdoption.cats,
            advanced.avgDaysToAdoption.dogs
          )}
        />
        <AdvancedKpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Taux de conversion"
          value={`${advanced.conversion.rate}%`}
          hint={
            advanced.conversion.applicationsTotal > 0
              ? `${advanced.conversion.applicationsAccepted} acceptée${advanced.conversion.applicationsAccepted > 1 ? "s" : ""} sur ${advanced.conversion.applicationsTotal}`
              : "Aucune candidature reçue"
          }
        />
        <AdvancedKpi
          icon={<Inbox className="h-4 w-4" />}
          label="Candidatures / adoption"
          value={
            advanced.conversion.avgApplicationsPerAdoption !== null
              ? String(advanced.conversion.avgApplicationsPerAdoption)
              : "à mesurer"
          }
          hint="En moyenne par animal adopté"
        />
        <AdvancedKpi
          icon={<Zap className="h-4 w-4" />}
          label="Activité 30 derniers jours"
          value={`${advanced.recent.adoptionsLast30d} adopté${advanced.recent.adoptionsLast30d > 1 ? "s" : ""}`}
          hint={`${advanced.recent.applicationsLast30d} candidature${advanced.recent.applicationsLast30d > 1 ? "s" : ""} reçue${advanced.recent.applicationsLast30d > 1 ? "s" : ""}`}
        />
      </section>

      {/* Bloc 3 : alertes actionnables */}
      {(advanced.staleApplications > 0 || advanced.hardToPlace.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          {advanced.staleApplications > 0 && (
            <AlertCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title={`${advanced.staleApplications} candidature${advanced.staleApplications > 1 ? "s" : ""} sans réponse depuis > 7 jours`}
              description="Une réponse rapide est l'un des meilleurs leviers d'adoption. Les templates de réponses peuvent vous faire gagner du temps."
              href="/shelter-candidatures?filter=pending"
              cta="Traiter en priorité"
            />
          )}
          {advanced.hardToPlace.length > 0 && (
            <AlertCard
              icon={<Heart className="h-5 w-5" />}
              title={`${advanced.hardToPlace.length} animal${advanced.hardToPlace.length > 1 ? "ux" : ""} en attente depuis > 90 jours`}
              description="Pensez à rafraîchir leurs photos, mettre à jour la description, ou les partager sur vos réseaux. Une fiche revue gagne en visibilité."
              variant="amber"
            />
          )}
        </section>
      )}

      {/* Bloc 4 : répartition par espèce */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-lg font-semibold">Par espèce</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Suivez le rythme d&apos;adoption chat / chien séparément.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SpeciesBlock
            label="Chats"
            emoji="🐈"
            total={advanced.bySpecies.chat.total}
            available={advanced.bySpecies.chat.available}
            adopted={advanced.bySpecies.chat.adopted}
            avgDays={advanced.avgDaysToAdoption.cats}
          />
          <SpeciesBlock
            label="Chiens"
            emoji="🐕"
            total={advanced.bySpecies.chien.total}
            available={advanced.bySpecies.chien.available}
            adopted={advanced.bySpecies.chien.adopted}
            avgDays={advanced.avgDaysToAdoption.dogs}
          />
        </div>
      </section>

      {/* Bloc 5 : histogramme adoptions */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Adoptions sur 12 mois glissants
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Repérer les pics et les creux pour ajuster votre communication.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">
              {advanced.monthlyAdoptions.reduce(
                (s, m) => s + m.count,
                0
              )}
            </strong>{" "}
            sur 12 mois
          </p>
        </div>
        <AdoptionHistogram data={advanced.monthlyAdoptions} />
      </section>

      {/* Bloc 6 : animaux à booster */}
      {advanced.hardToPlace.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-6">
          <header className="mb-4">
            <h2 className="text-lg font-semibold">À booster en priorité</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Animaux publiés depuis plus de 90 jours, triés par ancienneté.
              Une fiche actualisée (nouvelle photo, description enrichie)
              repart en tête de catalogue.
            </p>
          </header>
          <ul className="divide-y divide-border">
            {advanced.hardToPlace.map((pet) => (
              <li
                key={pet.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/shelter-animaux/${pet.id}/edit`}
                    className="font-semibold text-foreground hover:text-coral-600"
                  >
                    {pet.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pet.species === "chat" ? "Chat" : "Chien"}
                    {pet.breed ? ` · ${pet.breed}` : ""} · publié il y a{" "}
                    {pet.daysAvailable} jours · {pet.applicationsCount}{" "}
                    candidature{pet.applicationsCount > 1 ? "s" : ""}
                  </p>
                </div>
                <Link
                  href={`/shelter-animaux/${pet.id}/edit`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "shrink-0"
                  )}
                >
                  Rafraîchir
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bloc 7 : traitement des candidatures (existant, conservé) */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Traitement des candidatures
        </h2>
        <div className="space-y-3">
          <Bar
            label="En attente"
            value={stats.applicationsPending}
            total={stats.applicationsTotal}
            color="bg-coral-500"
          />
          <Bar
            label="Acceptées"
            value={stats.applicationsAccepted}
            total={stats.applicationsTotal}
            color="bg-green-500"
          />
          <Bar
            label="Refusées / annulées"
            value={
              stats.applicationsTotal -
              stats.applicationsPending -
              stats.applicationsAccepted
            }
            total={stats.applicationsTotal}
            color="bg-sable-400"
          />
        </div>
        {stats.applicationsPending > 0 && (
          <div className="mt-4">
            <Link
              href="/shelter-candidatures?filter=pending"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Traiter les candidatures en attente
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sublabel?: string;
  accent?: "default" | "coral" | "green" | "lavande";
}) {
  const accentColors: Record<string, string> = {
    default: "text-foreground",
    coral: "text-coral-600",
    green: "text-green-700",
    lavande: "text-lavande-700",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={`flex items-center gap-2 ${accentColors[accent]}`}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
      {sublabel && (
        <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>
      )}
    </div>
  );
}

function AdvancedKpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function AlertCard({
  icon,
  title,
  description,
  href,
  cta,
  variant = "coral",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  cta?: string;
  variant?: "coral" | "amber";
}) {
  const styles =
    variant === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-coral-300 bg-coral-50 text-coral-900";
  return (
    <div className={`rounded-lg border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{title}</p>
          <p className="mt-1 text-sm">{description}</p>
          {href && cta && (
            <Link
              href={href}
              className="mt-3 inline-block text-sm font-semibold underline hover:no-underline"
            >
              {cta}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SpeciesBlock({
  label,
  emoji,
  total,
  available,
  adopted,
  avgDays,
}: {
  label: string;
  emoji: string;
  total: number;
  available: number;
  adopted: number;
  avgDays: number | null;
}) {
  const rate = total > 0 ? Math.round((adopted / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-sable-50/40 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-base font-semibold text-foreground">
          {emoji} {label}
        </p>
        <p className="text-xs text-muted-foreground">{total} fiches</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {available}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">
            Disponibles
          </p>
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums text-green-700">
            {adopted}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">
            Adoptés
          </p>
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums text-coral-700">
            {rate}%
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">
            Taux adoption
          </p>
        </div>
      </div>
      <p className="mt-3 border-t border-border/60 pt-2 text-xs text-muted-foreground">
        Durée moyenne avant adoption :{" "}
        <strong className="text-foreground">
          {avgDays !== null ? `${avgDays} jours` : "à mesurer"}
        </strong>
      </p>
    </div>
  );
}

function AdoptionHistogram({
  data,
}: {
  data: Array<{ monthKey: string; count: number }>;
}) {
  const filled = fill12Months(data);
  const max = Math.max(1, ...filled.map((m) => m.count));

  return (
    <div className="flex h-32 items-end gap-1.5">
      {filled.map((m) => {
        const heightPct = max > 0 ? (m.count / max) * 100 : 0;
        return (
          <div
            key={m.monthKey}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div
              className="relative w-full overflow-hidden rounded-t bg-green-500/80 transition-all"
              style={{ height: `${Math.max(heightPct, 3)}%` }}
              aria-label={`${m.count} adoption${m.count > 1 ? "s" : ""} en ${formatMonthLabel(m.monthKey)}`}
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

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value}{" "}
          {total > 0 && (
            <span className="text-muted-foreground">· {percent}%</span>
          )}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function formatAvgHint(cats: number | null, dogs: number | null): string {
  if (cats === null && dogs === null) {
    return "Pas encore d'adoption à mesurer";
  }
  const parts: string[] = [];
  if (cats !== null) parts.push(`Chats : ${cats} j`);
  if (dogs !== null) parts.push(`Chiens : ${dogs} j`);
  return parts.join(" · ");
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
