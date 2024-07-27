import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Bell,
  ExternalLink,
  Flag,
  Heart,
  Home,
  Mail,
  MailX,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Badge } from "@shared/ui/badge";
import {
  getAdminUserDetail,
  getUserFollowedShelters,
  getUserRecentApplications,
  getUserRecentReports,
} from "@identity/public";
import { UserBadge } from "@gamification/public";

export const metadata: Metadata = {
  title: "Profil utilisateur · Plateforme",
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  envoyee: "Envoyée",
  en_cours: "En cours",
  acceptee: "Acceptée",
  refusee: "Refusée",
  annulee: "Annulée",
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  perdu: "Perdu",
  trouve: "Trouvé",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, applications, reports, followedShelters] = await Promise.all([
    getAdminUserDetail(id),
    getUserRecentApplications(id, 10),
    getUserRecentReports(id, 10),
    getUserFollowedShelters(id),
  ]);

  if (!detail) notFound();
  const { user, shelter, counts, recentSessions, reportsAgainst } = detail;

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la liste
      </Link>

      {/* Header */}
      <section className="mb-8 flex flex-wrap items-start gap-5 rounded-xl border border-border bg-card p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
          {user.image ? (
            <Image
              src={user.image}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            (user.name.trim().charAt(0).toUpperCase() || "?")
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <RoleBadge role={user.role} />
            <UserBadge count={user.resolvedCount} variant="inline" />
            {user.emailVerified ? (
              <Badge
                variant="outline"
                className="border-green-200 text-green-700"
              >
                <Mail className="h-3 w-3" />
                Email vérifié
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-200 text-amber-700"
              >
                <MailX className="h-3 w-3" />
                Email non vérifié
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            {user.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {user.phone}
              </span>
            )}
            {user.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {user.location.y.toFixed(4)}, {user.location.x.toFixed(4)}
                {user.notificationRadiusKm
                  ? ` · ${user.notificationRadiusKm} km`
                  : null}
              </span>
            )}
            {user.hasPushSubscription && (
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                Push activé
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Inscrit le{" "}
            {new Date(user.createdAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}{" "}
            · dernière modif{" "}
            {new Date(user.updatedAt).toLocaleDateString("fr-FR")}
            {" · "}
            ID <code className="font-mono text-[10px]">{user.id}</code>
          </p>
        </div>
      </section>

      {/* Refuge rattaché si shelter_admin */}
      {shelter && (
        <section className="mb-6 rounded-xl border border-lavande-200 bg-lavande-50/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-lavande-700">
            Admin du refuge
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {shelter.name}
            </h2>
            {shelter.isVerified ? (
              <Badge
                variant="outline"
                className="border-green-200 text-green-700"
              >
                <ShieldCheck className="h-3 w-3" />
                Vérifié
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-200 text-amber-700"
              >
                Non vérifié
              </Badge>
            )}
            <Link
              href={`/refuges/${shelter.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              voir la fiche publique
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}

      {/* Stats */}
      {counts && (
        <section className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Activité sur la plateforme
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Signalements"
              sublabel="Perdus / trouvés"
              value={counts.reports}
              icon={<Flag className="h-5 w-5" />}
              accent="coral"
            />
            <StatTile
              label="Candidatures"
              sublabel="Adoption"
              value={counts.applications}
              icon={<Home className="h-5 w-5" />}
              accent="lavande"
            />
            <StatTile
              label="Favoris"
              sublabel="Chats sauvegardés"
              value={counts.favorites}
              icon={<Heart className="h-5 w-5" />}
              accent="rose"
            />
            <StatTile
              label="Refuges suivis"
              sublabel="Alertes actives"
              value={counts.follows}
              icon={<Bell className="h-5 w-5" />}
              accent="prune"
            />
          </div>

          <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Technique
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <StatStrip
              label="Notifications reçues"
              value={counts.notifications}
              icon={<Bell className="h-4 w-4" />}
            />
            <StatStrip
              label="Sessions actives"
              value={counts.sessions}
              icon={<Smartphone className="h-4 w-4" />}
            />
            <StatStrip
              label="Contenus signalés"
              value={counts.reportsMade}
              icon={<Flag className="h-4 w-4" />}
              hint="Signalements de contenu faits par ce user"
            />
          </div>
        </section>
      )}

      {/* Signalements reçus contre lui */}
      {reportsAgainst.length > 0 && (
        <section className="mb-8 rounded-xl border border-coral-200 bg-coral-50/40 p-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-coral-700" />
            <h2 className="text-sm font-semibold text-coral-700">
              {reportsAgainst.length} signalement
              {reportsAgainst.length > 1 ? "s" : ""} contre ce compte
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {reportsAgainst.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="rounded-md bg-white/60 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium">{r.reason}</span>
                    {r.comment && (
                      <p className="mt-0.5 text-muted-foreground">
                        {r.comment}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Candidatures */}
      <Section title="Candidatures adoption" count={counts?.applications}>
        {applications.length === 0 ? (
          <EmptyRow>Aucune candidature.</EmptyRow>
        ) : (
          <ul className="divide-y divide-border">
            {applications.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {a.photoUrl && (
                    <Image
                      src={a.photoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/adopter/${a.pet.id}`}
                    target="_blank"
                    className="font-medium hover:text-coral-600"
                  >
                    {a.pet.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {a.shelter.name}
                  </div>
                </div>
                <Badge variant="outline">
                  {APPLICATION_STATUS_LABELS[a.status] ?? a.status}
                </Badge>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Signalements perdus/trouvés */}
      <Section title="Signalements perdus/trouvés" count={counts?.reports}>
        {reports.length === 0 ? (
          <EmptyRow>Aucun signalement.</EmptyRow>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Badge
                  variant="outline"
                  className={
                    r.type === "perdu"
                      ? "border-coral-300 text-coral-700"
                      : "border-green-300 text-green-700"
                  }
                >
                  {REPORT_TYPE_LABELS[r.type] ?? r.type}
                </Badge>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/perdus-trouves/${r.id}`}
                    target="_blank"
                    className="font-medium hover:text-coral-600"
                  >
                    {r.petName ?? "Chat sans nom"}
                  </Link>
                  {r.address && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{r.address}</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline">{r.status}</Badge>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(r.dateEvent).toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Refuges suivis */}
      <Section title="Refuges suivis" count={counts?.follows}>
        {followedShelters.length === 0 ? (
          <EmptyRow>Ce user ne suit aucun refuge.</EmptyRow>
        ) : (
          <ul className="divide-y divide-border">
            {followedShelters.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/refuges/${s.id}`}
                    target="_blank"
                    className="font-medium hover:text-coral-600"
                  >
                    {s.name}
                  </Link>
                </div>
                {s.isVerified && (
                  <Badge
                    variant="outline"
                    className="border-green-200 text-green-700"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Vérifié
                  </Badge>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  suivi depuis{" "}
                  {new Date(s.followedAt).toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Sessions récentes */}
      <Section title="Sessions récentes">
        {recentSessions.length === 0 ? (
          <EmptyRow>Aucune session enregistrée.</EmptyRow>
        ) : (
          <ul className="divide-y divide-border">
            {recentSessions.map((s) => {
              const expired = new Date(s.expiresAt).getTime() < Date.now();
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-muted-foreground">
                      {s.userAgent ?? "Agent inconnu"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.ipAddress ?? "IP inconnue"}
                    </div>
                  </div>
                  {expired ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Expirée
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-green-200 text-green-700"
                    >
                      Active
                    </Badge>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: "user" | "shelter_admin" | "pension_admin" | "platform_admin";
}) {
  if (role === "platform_admin") {
    return <Badge className="bg-prune text-white hover:bg-prune/90">Plateforme</Badge>;
  }
  if (role === "shelter_admin") {
    return <Badge className="bg-lavande text-white hover:bg-lavande/90">Refuge</Badge>;
  }
  if (role === "pension_admin") {
    return <Badge className="bg-coral text-white hover:bg-coral/90">Pension</Badge>;
  }
  return <Badge variant="outline">Adoptant</Badge>;
}

type Accent = "coral" | "lavande" | "rose" | "prune";

const ACCENT_STYLES: Record<
  Accent,
  { iconBg: string; iconText: string; border: string; bg: string }
> = {
  coral: {
    iconBg: "bg-coral-100",
    iconText: "text-coral-700",
    border: "border-coral-200",
    bg: "bg-coral-50/50",
  },
  lavande: {
    iconBg: "bg-lavande-100",
    iconText: "text-lavande-700",
    border: "border-lavande-200",
    bg: "bg-lavande-50/50",
  },
  rose: {
    iconBg: "bg-pink-100",
    iconText: "text-pink-600",
    border: "border-pink-200",
    bg: "bg-pink-50/50",
  },
  prune: {
    iconBg: "bg-prune-100",
    iconText: "text-prune-700",
    border: "border-prune-200",
    bg: "bg-prune-50/50",
  },
};

function StatTile({
  label,
  sublabel,
  value,
  icon,
  accent,
}: {
  label: string;
  sublabel?: string;
  value: number;
  icon: React.ReactNode;
  accent: Accent;
}) {
  const zero = value === 0;
  const style = ACCENT_STYLES[accent];

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
        zero
          ? "border-border bg-card/50"
          : `${style.border} ${style.bg}`
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          zero ? "bg-muted text-muted-foreground/50" : `${style.iconBg} ${style.iconText}`
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-2xl font-bold tabular-nums leading-none ${
            zero ? "text-muted-foreground/60" : "text-foreground"
          }`}
        >
          {value}
        </div>
        <div className="mt-1 truncate text-xs font-medium text-foreground">
          {label}
        </div>
        {sublabel && (
          <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

function StatStrip({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
}) {
  const zero = value === 0;
  return (
    <div
      title={hint}
      className={`flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm ${
        zero ? "opacity-60" : ""
      }`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-muted-foreground">{count}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
