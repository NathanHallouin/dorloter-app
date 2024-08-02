import type { Metadata } from "next";
import Link from "next/link";
import { Flag, ShieldCheck } from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  contentReports,
  shelters,
  users,
  reports,
  pets,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Tableau de bord · Plateforme",
};

export default async function AdminHomePage() {
  const [
    pendingModeration,
    unverifiedShelters,
    totalUsers,
    totalShelters,
    totalCats,
    totalReports,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentReports)
      .where(eq(contentReports.status, "en_attente"))
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(shelters)
      .where(eq(shelters.isVerified, false))
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(shelters)
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pets)
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .then((r) => Number(r[0]?.count ?? 0)),
  ]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Administration</h1>
        <p className="mt-2 text-muted-foreground">
          Ce qui nécessite votre attention, et l&apos;état général de la
          plateforme.
        </p>
      </header>

      {/* Actions urgentes */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <ActionCard
          href="/admin/moderation"
          icon={<Flag className="h-5 w-5" />}
          title="Modération"
          count={pendingModeration}
          unit="signalement"
          emptyLabel="Aucun contenu signalé."
        />
        <ActionCard
          href="/admin/shelters"
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Refuges à vérifier"
          count={unverifiedShelters}
          unit="refuge"
          emptyLabel="Tous les refuges sont vérifiés."
        />
      </div>

      {/* Stats globales */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Vue d&apos;ensemble
      </h2>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatMini
          label="Utilisateurs"
          value={totalUsers}
          href="/admin/users"
        />
        <StatMini label="Refuges" value={totalShelters} />
        <StatMini label="Chats" value={totalCats} />
        <StatMini label="Signalements" value={totalReports} />
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  count,
  unit,
  emptyLabel,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  unit: string;
  emptyLabel: string;
}) {
  const empty = count === 0;
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-lg border bg-card p-4 transition ${
        empty
          ? "border-border hover:border-sable-300"
          : "border-coral-300 bg-coral-50/30 hover:border-coral-500"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          empty
            ? "bg-sable-100 text-foreground"
            : "bg-coral-500 text-white"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        {empty ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <p className="text-sm text-foreground">
            <strong>{count}</strong> {unit}
            {count > 1 ? "s" : ""} à traiter.
          </p>
        )}
      </div>
    </Link>
  );
}

function StatMini({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-sable-300 hover:bg-muted/30"
      >
        {content}
      </Link>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4">{content}</div>
  );
}
