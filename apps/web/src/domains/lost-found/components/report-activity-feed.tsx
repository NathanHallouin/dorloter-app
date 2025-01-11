import {
  Bell,
  Eye,
  Flag,
  MessageSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface ActivityEvent {
  id: string;
  kind: "created" | "sighting" | "match" | "resolved" | "shared";
  title: string;
  description?: string;
  at: Date;
  /** True si l'événement vient du créateur du signalement (publication,
   * résolution, sighting déposé par lui-même). Met l'entrée en évidence. */
  byOwner?: boolean;
}

const KIND_STYLES: Record<
  ActivityEvent["kind"],
  { Icon: LucideIcon; iconBg: string; iconText: string }
> = {
  created: {
    Icon: Flag,
    iconBg: "bg-coral-100",
    iconText: "text-coral-700",
  },
  sighting: {
    Icon: Eye,
    iconBg: "bg-lavande-100",
    iconText: "text-lavande-700",
  },
  match: {
    Icon: Sparkles,
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
  },
  resolved: {
    Icon: Bell,
    iconBg: "bg-green-100",
    iconText: "text-green-700",
  },
  shared: {
    Icon: MessageSquare,
    iconBg: "bg-sable-100",
    iconText: "text-foreground",
  },
};

interface ReportActivityFeedProps {
  events: ActivityEvent[];
  /** IDs à mettre en avant temporairement (ex. nouveaux events détectés au polling). */
  highlightIds?: ReadonlySet<string>;
}

/**
 * Flux d'activité d'un signalement : événements temporels réels
 * (création, sightings, matches détectés, résolution). Trié par
 * récence décroissante côté serveur.
 */
export function ReportActivityFeed({
  events,
  highlightIds,
}: ReportActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-sable-50/40 p-4 text-center text-sm text-muted-foreground">
        Pas encore d&apos;activité. Partagez la fiche pour la faire vivre.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ol className="divide-y divide-border">
        {events.map((event) => {
          const style = KIND_STYLES[event.kind];
          const Icon = style.Icon;
          const isNew = highlightIds?.has(event.id);
          const isOwner = !!event.byOwner;
          return (
            <li
              key={event.id}
              className={`relative flex items-start gap-3 px-3 py-3 transition-colors duration-1000 ${
                isNew
                  ? "bg-coral-50/60"
                  : isOwner
                    ? "bg-sable-50/60"
                    : ""
              }`}
            >
              {(isNew || isOwner) && (
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-0.5 ${
                    isNew ? "bg-coral-400" : "bg-sable-400"
                  }`}
                />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconBg} ${style.iconText} ${
                  isOwner ? "ring-2 ring-sable-300 ring-offset-1 ring-offset-card" : ""
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                  {event.title}
                  {isOwner && (
                    <span className="inline-flex items-center rounded-full bg-sable-200/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sable-800">
                      Auteur
                    </span>
                  )}
                </p>
                {event.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {event.description}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatRelative(event.at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
