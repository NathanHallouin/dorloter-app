import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { publicEventsApi, type CalendarFilters, type CalendarEvent, type EventType } from "@dorloter/client";
import { LostFoundMap, type MapPin } from "@/components/LostFoundMap";
import { Icon } from "@dorloter/ui";
import { Btn, FilterChip } from "@dorloter/ui";

const TYPE_LABEL: Record<EventType, string> = {
  collecte: "Collecte",
  journee_adoption: "Journée adoption",
  porte_ouverte: "Portes ouvertes",
  marche: "Salon / marché",
  sensibilisation: "Sensibilisation",
  autre: "Autre",
};
const TYPE_ICON: Record<EventType, string> = {
  collecte: "briefcase",
  journee_adoption: "heart",
  porte_ouverte: "home",
  marche: "store",
  sensibilisation: "radio",
  autre: "calendar",
};
const TYPES = Object.keys(TYPE_LABEL) as EventType[];

const MONTHS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

/** Fenêtres de dates proposées (calculées côté client). */
const WINDOWS = [
  { key: "all", label: "À venir", days: null as number | null },
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "3 mois", days: 90 },
];
const toDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function EventsPage() {
  const [type, setType] = useState<EventType | "tous">("tous");
  const [win, setWin] = useState("all");
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const filters: CalendarFilters = {
    type: type === "tous" ? undefined : type,
    to: (() => {
      const w = WINDOWS.find((x) => x.key === win);
      return w?.days ? toDate(w.days) : undefined;
    })(),
    lat: near?.lat,
    lng: near?.lng,
    radiusKm: near ? 50 : undefined,
  };

  const query = useInfiniteQuery({
    queryKey: ["public-events", filters],
    queryFn: ({ pageParam }) => publicEventsApi.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.cursor ?? undefined,
  });
  const events = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);

  const pins: MapPin[] = events
    .filter((e) => e.shelter.latitude != null && e.shelter.longitude != null)
    .map((e) => ({
      id: e.id,
      lat: e.shelter.latitude!,
      lng: e.shelter.longitude!,
      tone: "coral" as const,
      icon: TYPE_ICON[e.type],
      big: e.id === activeId,
    }));
  const focus = near ?? (pins[0] ? { lng: pins[0].lng, lat: pins[0].lat } : null);

  function locateMe() {
    setGeoError(null);
    if (!navigator.geolocation) { setGeoError("Géolocalisation indisponible sur cet appareil."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Localisation refusée. Activez-la pour voir les événements proches."),
    );
  }

  return (
    <div>
      {/* en-tête */}
      <div className="border-b border-line bg-card">
        <div className="mx-auto max-w-[1180px] px-8 pt-7">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span>Accueil</span><Icon name="chevron" size={14} /><span className="font-semibold text-coral-600">Événements</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-[38px] font-semibold tracking-[-0.01em] text-foreground">Événements adoption</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Portes ouvertes, journées d'adoption, collectes et salons près de chez vous.
              </p>
            </div>
            <Btn variant={near ? "primary" : "soft"} icon="marker" onClick={near ? () => setNear(null) : locateMe}>
              {near ? "Autour de moi (activé)" : "Autour de moi"}
            </Btn>
          </div>
          {geoError && <p className="mt-2 text-[13px] text-brick-600">{geoError}</p>}
          <div className="np-scroll flex items-center gap-2 overflow-x-auto py-[18px]">
            <FilterChip active={type === "tous"} onClick={() => setType("tous")}>Tous</FilterChip>
            {TYPES.map((t) => (
              <FilterChip key={t} active={type === t} onClick={() => setType(t)} icon={TYPE_ICON[t]}>{TYPE_LABEL[t]}</FilterChip>
            ))}
            <span className="mx-1 h-6 w-px flex-none bg-line" />
            {WINDOWS.map((w) => (
              <FilterChip key={w.key} active={win === w.key} onClick={() => setWin(w.key)}>{w.label}</FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* corps : liste + carte */}
      <div className="mx-auto grid max-w-[1180px] grid-cols-[1fr_400px] gap-6 px-8 pb-[60px] pt-[26px] max-lg:grid-cols-1">
        <div>
          {query.isLoading && <p className="text-muted-foreground">Chargement…</p>}
          {query.isError && <p className="text-brick-600">Impossible de charger les événements.</p>}
          {!query.isLoading && events.length === 0 && (
            <div className="px-5 py-[70px] text-center text-muted-foreground">
              <span className="inline-flex text-sable-300"><Icon name="calendar" size={46} /></span>
              <p className="mt-3.5 font-semibold text-foreground">Aucun événement à venir</p>
              <p className="mt-1 text-[14px]">{near ? "Élargissez la zone ou " : ""}Revenez bientôt, les refuges publient régulièrement.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {events.map((e) => (
              <EventCard key={e.id} e={e} active={e.id === activeId} onHover={() => setActiveId(e.id)} />
            ))}
          </div>

          {query.hasNextPage && (
            <div className="mt-7 text-center">
              <Btn variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? "Chargement…" : "Charger plus"}
              </Btn>
            </div>
          )}
        </div>

        {/* carte (sticky sur desktop) */}
        <div className="max-lg:order-first">
          <div className="sticky top-[86px] h-[440px] overflow-hidden rounded-[8px] border border-line max-lg:h-[300px]">
            {pins.length > 0 ? (
              <LostFoundMap pins={pins} activeId={activeId} focus={focus} onSelect={(id) => setActiveId(id)} />
            ) : (
              <div className="grid h-full place-items-center bg-muted text-[13px] text-muted-foreground">Carte indisponible</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ e, active, onHover }: { e: CalendarEvent; active: boolean; onHover: () => void }) {
  const d = new Date(e.startsAt);
  return (
    <article
      onMouseEnter={onHover}
      className={`flex gap-4 rounded-[8px] border bg-card p-4 transition-colors ${active ? "border-coral-400" : "border-line"}`}
    >
      {/* pastille date */}
      <div className="flex h-[62px] w-[62px] flex-none flex-col items-center justify-center rounded-[8px] border border-coral-200 bg-coral-50">
        <span className="text-[24px] font-extrabold leading-none text-coral-700">{d.getDate()}</span>
        <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-coral-600">{MONTHS[d.getMonth()]}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            <Icon name={TYPE_ICON[e.type]} size={12} /> {TYPE_LABEL[e.type]}
          </span>
          {e.distanceMeters != null && (
            <span className="mono text-[10.5px] font-semibold text-coral-600">à {fmtDistance(e.distanceMeters)}</span>
          )}
        </div>
        <h3 className="mt-1.5 text-[19px] font-semibold tracking-[-0.01em] text-foreground">{e.title}</h3>
        <p className="mono mt-0.5 text-[11.5px] uppercase tracking-[0.04em] text-muted-foreground">
          {fmtTime(e.startsAt)}{e.endsAt ? ` · ${fmtTime(e.endsAt)}` : ""}{e.location ? ` · ${e.location}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <Link to={`/refuges/${e.shelter.slug}`} className="inline-flex items-center gap-1.5 font-semibold text-coral-700 hover:underline">
            <Icon name="home" size={14} /> {e.shelter.name}
          </Link>
          {e.needs && <span className="text-muted-foreground">· {e.needs}</span>}
        </div>
      </div>
    </article>
  );
}
