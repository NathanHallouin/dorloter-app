import type { Metadata } from "next";
import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { CalendarCheck, Clock, MapPin, User as UserIcon } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { getUpcomingBookingsForShelter, type VisitBooking } from "@shelters/public";
import { db } from "@infra/db";
import { users, pets } from "@/server/db/schema";
import { BookingActions } from "./booking-actions";

export const metadata: Metadata = {
  title: "Rendez-vous · Refuge",
};

export const dynamic = "force-dynamic";

interface Enriched {
  booking: VisitBooking;
  applicantName: string;
  applicantEmail: string;
  petName: string | null;
}

function bucket(b: VisitBooking): "pending" | "upcoming" | "past" {
  if (b.status === "en_attente") return "pending";
  if (
    b.status === "confirme" &&
    new Date(b.scheduledFor).getTime() > Date.now()
  )
    return "upcoming";
  return "past";
}

export default async function ShelterRdvPage() {
  const session = await requireShelter();

  // Inclure tous les RDV passés et futurs sur 60j pour la vue historique.
  const earliest = new Date();
  earliest.setDate(earliest.getDate() - 60);
  const allBookings = await getUpcomingBookingsForShelter(
    session.user.shelterId,
    earliest
  );

  if (allBookings.length === 0) {
    return <EmptyShell />;
  }

  const userIds = Array.from(new Set(allBookings.map((b) => b.userId)));
  const petIds = Array.from(
    new Set(allBookings.map((b) => b.petId).filter(Boolean) as string[])
  );

  const [userRows, petRows] = await Promise.all([
    userIds.length > 0
      ? db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([]),
    petIds.length > 0
      ? db
          .select({ id: pets.id, name: pets.name })
          .from(pets)
          .where(inArray(pets.id, petIds))
      : Promise.resolve([]),
  ]);
  const userMap = new Map(userRows.map((u) => [u.id, u]));
  const petMap = new Map(petRows.map((p) => [p.id, p]));

  const enriched: Enriched[] = allBookings.map((b) => ({
    booking: b,
    applicantName: userMap.get(b.userId)?.name ?? "Inconnu·e",
    applicantEmail: userMap.get(b.userId)?.email ?? "",
    petName: b.petId ? (petMap.get(b.petId)?.name ?? null) : null,
  }));

  const pending = enriched.filter((e) => bucket(e.booking) === "pending");
  const upcoming = enriched.filter((e) => bucket(e.booking) === "upcoming");
  const past = enriched.filter((e) => bucket(e.booking) === "past");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <CalendarCheck className="h-7 w-7 text-coral-500" />
          Rendez-vous de visite
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending.length} en attente de confirmation · {upcoming.length} à
          venir · {past.length} dans l&apos;historique
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Vous configurez les créneaux ouverts depuis{" "}
          <Link
            href="/shelter-parametres-creneaux"
            className="text-coral-600 hover:underline"
          >
            Paramètres → Créneaux visite
          </Link>
          .
        </p>
      </header>

      {pending.length > 0 && (
        <Section title="À traiter (en attente de votre confirmation)" tone="coral">
          <BookingList items={pending} />
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Confirmés à venir" tone="default">
          <BookingList items={upcoming} />
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Historique" tone="muted">
          <BookingList items={past} compact />
        </Section>
      )}
    </div>
  );
}

function EmptyShell() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <CalendarCheck className="h-7 w-7 text-coral-500" />
          Rendez-vous de visite
        </h1>
      </header>
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="font-semibold text-foreground">Pas encore de RDV</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Les demandes des adoptants apparaîtront ici dès qu&apos;ils auront
          choisi un créneau parmi ceux que vous avez ouverts.
        </p>
        <Link
          href="/shelter-parametres-creneaux"
          className="mt-4 inline-block text-sm font-semibold text-coral-600 hover:underline"
        >
          Configurer vos créneaux ouverts
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "coral" | "default" | "muted";
  children: React.ReactNode;
}) {
  const colors: Record<typeof tone, string> = {
    coral: "text-coral-700",
    default: "text-foreground",
    muted: "text-muted-foreground",
  };
  return (
    <section>
      <h2
        className={`mb-3 text-sm font-semibold uppercase tracking-wider ${colors[tone]}`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function BookingList({
  items,
  compact = false,
}: {
  items: Enriched[];
  compact?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {items.map((e) => (
        <BookingRow key={e.booking.id} entry={e} compact={compact} />
      ))}
    </ul>
  );
}

function BookingRow({
  entry,
  compact,
}: {
  entry: Enriched;
  compact: boolean;
}) {
  const { booking, applicantName, applicantEmail, petName } = entry;
  const date = new Date(booking.scheduledFor);
  return (
    <li
      className={`rounded-xl border border-border bg-card p-4 ${compact ? "py-3" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
              <Clock className="h-3.5 w-3.5 text-coral-500" />
              {date.toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              -{" "}
              {date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-sm text-foreground">
            <UserIcon className="mr-1 inline h-3 w-3 text-muted-foreground" />
            <strong>{applicantName}</strong>
            {applicantEmail && (
              <a
                href={`mailto:${applicantEmail}`}
                className="ml-2 text-xs text-muted-foreground hover:text-coral-600"
              >
                {applicantEmail}
              </a>
            )}
          </p>
          {petName && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <MapPin className="mr-0.5 inline h-3 w-3" />
              Visite pour <strong>{petName}</strong>
            </p>
          )}
          {!compact && booking.userNotes && (
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-sable-50/50 px-3 py-2 text-xs text-foreground">
              {booking.userNotes}
            </p>
          )}
          {booking.shelterNotes && (
            <p className="mt-2 text-xs italic text-muted-foreground">
              Note interne : {booking.shelterNotes}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <BookingActions
            bookingId={booking.id}
            currentStatus={booking.status}
          />
        </div>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: VisitBooking["status"] }) {
  const meta: Record<
    VisitBooking["status"],
    { label: string; className: string }
  > = {
    en_attente: {
      label: "En attente",
      className: "bg-coral-100 text-coral-800",
    },
    confirme: {
      label: "Confirmé",
      className: "bg-green-100 text-green-800",
    },
    annule_par_refuge: {
      label: "Annulé (refuge)",
      className: "bg-sable-100 text-sable-800",
    },
    annule_par_user: {
      label: "Annulé (adoptant)",
      className: "bg-sable-100 text-sable-800",
    },
    honore: {
      label: "Honoré",
      className: "bg-lavande-100 text-lavande-800",
    },
    no_show: {
      label: "Non honoré",
      className: "bg-rose-100 text-rose-800",
    },
  };
  const m = meta[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.className}`}
    >
      {m.label}
    </span>
  );
}
