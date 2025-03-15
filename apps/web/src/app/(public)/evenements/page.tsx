import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  Heart,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  listPublicEvents,
  getSheltersWithUpcomingEvents,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_CLASSES,
  type PublicEvent,
  type ShelterEventType,
} from "@shelters/public";
import { EmptyState } from "@shared/ui/empty-state";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Événements des refuges",
  description:
    "Portes ouvertes, collectes, salons animaliers, appels d'urgence : retrouvez tous les événements organisés par les refuges partenaires Dorloter.",
  alternates: { canonical: "/evenements" },
  openGraph: {
    title: "Événements des refuges · Dorloter",
    description:
      "L'agenda des refuges partenaires : portes ouvertes, collectes, salons, appels à l'aide.",
    type: "website",
  },
};

interface PageProps {
  searchParams: Promise<{
    type?: string;
    shelter?: string;
  }>;
}

export default async function PublicEventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const type =
    params.type && (EVENT_TYPES as readonly string[]).includes(params.type)
      ? (params.type as ShelterEventType)
      : undefined;
  const shelterId = params.shelter || undefined;

  const [events, sheltersWithE] = await Promise.all([
    listPublicEvents({ type, shelterId }, 100),
    getSheltersWithUpcomingEvents(),
  ]);

  // Regroupement par jour
  const byDay = new Map<string, PublicEvent[]>();
  for (const e of events) {
    const key = new Date(e.startsAt).toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(e);
    byDay.set(key, list);
  }

  function chipHref(updates: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    const merged = { type, shelter: shelterId, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/evenements?${qs}` : "/evenements";
  }

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <section className="border-b border-sable-200 bg-gradient-to-br from-coral-50/50 via-white to-lavande-50/40 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-coral-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral-700">
              <Sparkles className="h-3 w-3" />
              Agenda refuges
            </p>
            <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Événements à venir
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {events.length} événement{events.length > 1 ? "s" : ""} sur les
              180 prochains jours. Portes ouvertes pour rencontrer les animaux,
              collectes pour soutenir les refuges, salons animaliers et appels
              d&apos;urgence.
            </p>
          </div>
        </section>

        <section className="border-b border-sable-200 bg-card/60 px-4 py-4">
          <div className="mx-auto max-w-5xl space-y-3">
            <FilterRow label="Type">
              <FilterChip
                href={chipHref({ type: undefined })}
                active={!type}
                label="Tous"
              />
              {EVENT_TYPES.map((t) => (
                <FilterChip
                  key={t}
                  href={chipHref({ type: t })}
                  active={type === t}
                  label={EVENT_TYPE_LABELS[t]}
                />
              ))}
            </FilterRow>

            {sheltersWithE.length > 0 && (
              <FilterRow label="Refuge">
                <FilterChip
                  href={chipHref({ shelter: undefined })}
                  active={!shelterId}
                  label="Tous"
                />
                {sheltersWithE.slice(0, 10).map((s) => (
                  <FilterChip
                    key={s.id}
                    href={chipHref({ shelter: s.id })}
                    active={shelterId === s.id}
                    label={`${s.name} (${s.count})`}
                  />
                ))}
              </FilterRow>
            )}

            {(type || shelterId) && (
              <Link
                href="/evenements"
                className="text-xs text-coral-600 hover:underline"
              >
                Réinitialiser les filtres
              </Link>
            )}
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            {events.length === 0 ? (
              <EmptyState
                variant="illustrated"
                icon={<Heart className="h-9 w-9" />}
                title="Aucun événement avec ces filtres"
                hint="Élargissez la sélection ou revenez bientôt — les refuges publient régulièrement."
              />
            ) : (
              <ol className="space-y-8">
                {Array.from(byDay.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dayKey, dayEvents]) => (
                    <li key={dayKey}>
                      <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-foreground">
                        <Calendar className="h-4 w-4 text-coral-500" />
                        {formatDayLabel(dayKey)}
                      </h2>
                      <ul className="space-y-3">
                        {dayEvents.map((e) => (
                          <EventCard key={e.id} event={e} />
                        ))}
                      </ul>
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
        active
          ? "bg-coral-500 text-white"
          : "border border-border bg-card text-foreground hover:border-coral-300"
      }`}
    >
      {label}
    </Link>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  const cl = EVENT_TYPE_CLASSES[event.type];
  return (
    <li className="rounded-xl border border-border bg-card p-4 transition hover:border-coral-300/70 hover:shadow-md">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text} ${cl.border}`}
            >
              {EVENT_TYPE_LABELS[event.type]}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {new Date(event.startsAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {event.endsAt && (
                <>
                  {" → "}
                  {new Date(event.endsAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground">{event.title}</h3>
          {event.description && (
            <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {event.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link
              href={`/refuges/${event.shelterSlug}`}
              className="font-medium text-foreground hover:text-coral-600"
            >
              {event.shelterName}
            </Link>
            {event.effectiveAddress && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.effectiveAddress}
              </span>
            )}
          </div>
        </div>
        {event.externalUrl && (
          <a
            href={event.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-coral-300 bg-coral-50 px-3 py-1.5 text-xs font-semibold text-coral-700 hover:bg-coral-100"
          >
            <ExternalLink className="h-3 w-3" />
            S&apos;inscrire / Détails
          </a>
        )}
      </div>
    </li>
  );
}

function formatDayLabel(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (day.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year:
      date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}
