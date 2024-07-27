import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint, Heart, Mail, CheckCircle } from "lucide-react";
import { buttonVariants } from "@shared/ui/button";
import { requireShelter } from "@infra/auth/session";
import { getShelterStats } from "@adoption/public";

export const metadata: Metadata = {
  title: "Statistiques — Refuge",
};

export default async function ShelterStatsPage() {
  const session = await requireShelter();
  const stats = await getShelterStats(session.user.shelterId);

  const adoptionRate =
    stats.catsTotal > 0
      ? Math.round((stats.catsAdopted / stats.catsTotal) * 100)
      : 0;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Statistiques</h1>
        <p className="mt-2 text-muted-foreground">
          Ce qui bouge sur le refuge ces derniers temps.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<PawPrint className="h-5 w-5" />}
          label="Chats publiés"
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
      </div>

      <section className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Traitement des candidatures</h2>
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
