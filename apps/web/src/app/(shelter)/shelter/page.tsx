import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { eq, desc } from "drizzle-orm";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Heart,
  Inbox,
  MessageCircle,
  PawPrint,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { db } from "@infra/db";
import { pets, shelters } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import {
  getShelterStats,
  getApplicationsForShelter,
  getPrimaryPhotosForPets,
} from "@adoption/public";
import { getShelterUnreadCount } from "@messaging/public";

export const metadata: Metadata = {
  title: "Tableau de bord · Refuge",
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  envoyee: "Envoyée",
  en_cours: "En cours",
  acceptee: "Acceptée",
  refusee: "Refusée",
  annulee: "Annulée",
};

export default async function ShelterHomePage() {
  const session = await requireShelter();
  const shelterId = session.user.shelterId;

  const [shelter, stats, unreadMessages, recentPets, allApplications] =
    await Promise.all([
      db
        .select()
        .from(shelters)
        .where(eq(shelters.id, shelterId))
        .then((r) => r[0]),
      getShelterStats(shelterId),
      getShelterUnreadCount(shelterId),
      db
        .select()
        .from(pets)
        .where(eq(pets.shelterId, shelterId))
        .orderBy(desc(pets.createdAt))
        .limit(5),
      getApplicationsForShelter(shelterId),
    ]);

  if (!shelter) {
    return null;
  }

  const pendingApplications = allApplications
    .filter(
      (a) =>
        a.application.status === "envoyee" ||
        a.application.status === "en_cours"
    )
    .slice(0, 5);

  const photoMap = await getPrimaryPhotosForPets([
    ...recentPets.map((p) => p.id),
    ...pendingApplications.map((a) => a.pet.id),
  ]);

  const completenessIssues: string[] = [];
  if (!shelter.description) completenessIssues.push("Description manquante");
  if (!shelter.address) completenessIssues.push("Adresse manquante");
  if (!shelter.phone) completenessIssues.push("Téléphone manquant");
  if (!shelter.email) completenessIssues.push("Email manquant");
  if (!shelter.logoUrl) completenessIssues.push("Logo manquant");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-lavande-700">
          Tableau de bord
        </p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">
          Bonjour {shelter.name}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Voici ce qui demande votre attention aujourd&apos;hui.
        </p>
      </header>

      {/* Banner non-vérifié */}
      {!shelter.isVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">
              Refuge en attente de vérification
            </p>
            <p className="mt-1 text-sm text-amber-800">
              L&apos;équipe Dorloter doit valider votre fiche avant qu&apos;elle
              apparaisse avec le badge <strong>Vérifié</strong> dans
              l&apos;annuaire. Complétez votre profil pour accélérer le
              processus.
            </p>
            <Link
              href="/shelter-profil"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline"
            >
              Compléter le profil
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Banner profil incomplet (même vérifié) */}
      {shelter.isVerified && completenessIssues.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-lavande-200 bg-lavande-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-lavande-700" />
          <div className="flex-1">
            <p className="font-medium text-lavande-900">
              Quelques infos manquent sur votre fiche
            </p>
            <p className="mt-1 text-sm text-lavande-800">
              Les fiches complètes attirent davantage d&apos;adoptants.{" "}
              {completenessIssues.join(", ")}.
            </p>
            <Link
              href="/shelter-profil"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-lavande-900 hover:underline"
            >
              Compléter
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Actions urgentes */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          À traiter
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard
            href="/shelter-candidatures?filter=pending"
            icon={<Inbox className="h-5 w-5" />}
            title="Candidatures"
            count={stats.applicationsPending}
            unit="candidature"
            emptyLabel="Aucune candidature à traiter."
          />
          <ActionCard
            href="/shelter-messages"
            icon={<MessageCircle className="h-5 w-5" />}
            title="Messages"
            count={unreadMessages}
            unit="message"
            emptyLabel="Pas de message non lu."
          />
          <ActionCard
            href="/shelter-animaux"
            icon={<PawPrint className="h-5 w-5" />}
            title="Animaux disponibles"
            count={stats.catsAvailable}
            unit="animal"
            emptyLabel="Aucun animal publié."
            tone="neutral"
          />
        </div>
      </section>

      {/* Stats rapides */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vue d&apos;ensemble
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Publiés"
            value={stats.catsTotal}
            icon={<PawPrint className="h-4 w-4" />}
          />
          <StatTile
            label="Disponibles"
            value={stats.catsAvailable}
            icon={<CheckCircle className="h-4 w-4" />}
            accent="green"
          />
          <StatTile
            label="Réservés"
            value={stats.catsReserved}
            icon={<Heart className="h-4 w-4" />}
            accent="coral"
          />
          <StatTile
            label="Adoptés"
            value={stats.catsAdopted}
            icon={<ShieldCheck className="h-4 w-4" />}
            accent="lavande"
          />
        </div>
      </section>

      {/* Activité récente */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Derniers animaux ajoutés"
          actionLabel="Voir tout"
          actionHref="/shelter-animaux"
        >
          {recentPets.length === 0 ? (
            <EmptyRow
              icon={<PawPrint className="h-5 w-5" />}
              label="Aucun animal publié pour l'instant."
              ctaLabel="Ajouter un animal"
              ctaHref="/shelter-animaux/new"
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentPets.map((pet) => (
                <li key={pet.id}>
                  <Link
                    href={`/shelter-animaux/${pet.id}/edit`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sable-50"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {photoMap.get(pet.id) && (
                        <Image
                          src={photoMap.get(pet.id)!}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {pet.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pet.species === "chat" ? "Chat" : "Chien"}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                    </div>
                    <PetStatusBadge status={pet.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Candidatures à traiter"
          actionLabel="Voir tout"
          actionHref="/shelter-candidatures?filter=pending"
        >
          {pendingApplications.length === 0 ? (
            <EmptyRow
              icon={<Inbox className="h-5 w-5" />}
              label="Tout est à jour, pas de candidature en attente."
            />
          ) : (
            <ul className="divide-y divide-border">
              {pendingApplications.map(({ application, pet, applicant }) => (
                <li key={application.id}>
                  <Link
                    href={`/shelter-candidatures?filter=pending#${application.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sable-50"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {photoMap.get(pet.id) && (
                        <Image
                          src={photoMap.get(pet.id)!}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {applicant.name}{" "}
                        <span className="text-muted-foreground">pour</span>{" "}
                        {pet.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reçue le{" "}
                        {new Date(application.createdAt).toLocaleDateString(
                          "fr-FR"
                        )}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-semibold text-coral-700">
                      {APPLICATION_STATUS_LABELS[application.status] ??
                        application.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Raccourcis */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Raccourcis
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction
            href="/shelter-animaux/new"
            icon={<Plus className="h-4 w-4" />}
            label="Ajouter un animal"
          />
          <QuickAction
            href={`/refuges/${shelter.slug}`}
            icon={<ExternalLink className="h-4 w-4" />}
            label="Voir ma fiche publique"
            external
          />
          <QuickAction
            href="/shelter-profil"
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Gérer le profil refuge"
          />
        </div>
      </section>
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
  tone = "alert",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  unit: string;
  emptyLabel: string;
  tone?: "alert" | "neutral";
}) {
  const empty = count === 0;
  const accent = tone === "neutral";
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
        empty || accent
          ? "border-border bg-card hover:border-sable-300"
          : "border-coral-300 bg-coral-50/40 hover:border-coral-500"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          empty || accent
            ? "bg-sable-100 text-foreground"
            : "bg-coral-500 text-white"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {empty ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <p className="text-sm text-foreground">
            <strong className="tabular-nums">{count}</strong> {unit}
            {count > 1 ? "s" : ""}
            {tone === "alert" ? " à traiter." : "."}
          </p>
        )}
      </div>
    </Link>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "default" | "coral" | "green" | "lavande";
}) {
  const styles: Record<typeof accent, string> = {
    default: "text-foreground",
    coral: "text-coral-700",
    green: "text-green-700",
    lavande: "text-lavande-700",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`flex items-center gap-2 ${styles[accent]}`}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-coral-600"
          >
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function EmptyRow({
  icon,
  label,
  ctaLabel,
  ctaHref,
}: {
  icon: React.ReactNode;
  label: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm">
      <span className="text-muted-foreground/60">{icon}</span>
      <p className="text-muted-foreground">{label}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-coral-600"
        >
          <Plus className="h-3 w-3" />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {external && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
    </Link>
  );
}

function PetStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; className: string }
  > = {
    disponible: { label: "Disponible", className: "bg-green-100 text-green-800" },
    reserve: { label: "Réservé", className: "bg-lavande-100 text-lavande-800" },
    adopte: { label: "Adopté", className: "bg-coral-100 text-coral-800" },
    retire: { label: "Retiré", className: "bg-sable-100 text-sable-800" },
  };
  const c = config[status] ?? {
    label: status,
    className: "bg-muted text-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.className}`}
    >
      {c.label}
    </span>
  );
}
