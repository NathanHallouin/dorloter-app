import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  Bell,
  BellPlus,
  Building2,
  ChevronRight,
  FileHeart,
  Flag,
  Heart,
  Radio,
} from "lucide-react";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { ProfileForm } from "@identity/public";
import { PushToggle } from "@identity/public";
import { DeleteAccountSection } from "@identity/public";
import { DataExportSection } from "@identity/public";
import {
  UserBadgesGrid,
  getUserEngagementStats,
  deriveUserBadges,
} from "@gamification/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Mon profil",
};

export default async function ProfilPage() {
  const session = await requireAuth();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return null;

  const stats = await getUserEngagementStats(user.id);
  const badges = deriveUserBadges(stats);

  return (
    <PageContainer variant="wide" className="space-y-8">
      <PageHeader
        title="Mon profil"
        description="Qui vous êtes, où vous êtes, ce qu'on peut vous envoyer."
      />

      <ActivitySection stats={stats} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Mes badges
        </h2>
        <UserBadgesGrid badges={badges} />
      </section>

      <ProfileForm
        initialName={user.name}
        initialEmail={user.email}
        initialPhone={user.phone}
        initialLocation={user.location}
        initialRadiusKm={user.notificationRadiusKm}
      />

      <PushToggle />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Réglages liés
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SettingsLink
            href="/parametres/notifications"
            icon={<Bell className="h-4 w-4" />}
            title="Préférences de notifications"
            subtitle="Choisir ce que vous recevez par push et par email"
          />
          <SettingsLink
            href="/profil/recherches"
            icon={<BellPlus className="h-4 w-4" />}
            title="Recherches enregistrées"
            subtitle="Recevoir un email dès qu'un nouvel animal correspond"
          />
          <SettingsLink
            href="/parametres/signalements"
            icon={<Flag className="h-4 w-4" />}
            title="Mes signalements de contenu"
            subtitle="Suivi des contenus que vous avez reportés à l'équipe"
          />
        </div>
      </section>

      <DataExportSection />

      <DeleteAccountSection />
    </PageContainer>
  );
}

function SettingsLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-border px-4 py-3 transition last:border-b-0 hover:bg-muted/40"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

interface StatsType {
  favorites: number;
  applicationsActive: number;
  applicationsTotal: number;
  reportsActive: number;
  reportsTotal: number;
  reportsResolved: number;
  sheltersFollowed: number;
}

function ActivitySection({ stats }: { stats: StatsType }) {
  const items = [
    {
      href: "/favoris",
      icon: <Heart className="h-4 w-4" />,
      label: "Favoris",
      value: stats.favorites,
      hint: stats.favorites === 0 ? "Vos coups de cœur" : undefined,
    },
    {
      href: "/candidatures",
      icon: <FileHeart className="h-4 w-4" />,
      label: "Candidatures",
      value: stats.applicationsActive,
      hint:
        stats.applicationsTotal > stats.applicationsActive
          ? `${stats.applicationsTotal} au total`
          : "actives",
    },
    {
      href: "/mes-signalements",
      icon: <Radio className="h-4 w-4" />,
      label: "Signalements",
      value: stats.reportsActive,
      hint:
        stats.reportsResolved > 0
          ? `${stats.reportsResolved} résolu${stats.reportsResolved > 1 ? "s" : ""}`
          : "actifs",
    },
    {
      href: "/refuges",
      icon: <Building2 className="h-4 w-4" />,
      label: "Refuges suivis",
      value: stats.sheltersFollowed,
      hint: stats.sheltersFollowed === 0 ? "Suivez vos préférés" : undefined,
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Mon activité
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600">
                {it.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-bold tabular-nums text-foreground">
                  {it.value}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {it.label}
                  {it.hint ? ` · ${it.hint}` : ""}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
