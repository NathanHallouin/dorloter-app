"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";
import { ReportActivityFeed, type ActivityEvent } from "./report-activity-feed";

interface ReportActivityFeedLiveProps {
  reportId: string;
  /** Events SSR initial — affichés immédiatement pendant que le client poll. */
  initialEvents: ActivityEvent[];
  /** Intervalle de poll en millisecondes. 20s par défaut. */
  pollIntervalMs?: number;
}

interface ActivityResponse {
  events: Array<{
    id: string;
    kind: ActivityEvent["kind"];
    title: string;
    description?: string;
    at: string;
    byOwner?: boolean;
  }>;
  generatedAt: string;
}

/**
 * Flux d'activité auto-rafraîchi. Hydrate immédiatement avec les events
 * fournis par le serveur, puis lance un polling sur l'API
 * `GET /api/v1/reports/[id]/activity` toutes les 20s.
 *
 * Indicateur visuel "Mise à jour il y a Xs" + petit point pulsant pour
 * signifier que le flux est vivant. Au-delà de 2 minutes sans réponse,
 * passage en gris.
 */
export function ReportActivityFeedLive({
  reportId,
  initialEvents,
  pollIntervalMs = 20_000,
}: ReportActivityFeedLiveProps) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const lastEventIdsRef = useRef<Set<string>>(
    new Set(initialEvents.map((e) => e.id))
  );
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const fetchActivity = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/v1/reports/${reportId}/activity`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("activity_fetch_failed");
      const data = (await res.json()) as ActivityResponse;

      const nextEvents: ActivityEvent[] = data.events.map((e) => ({
        id: e.id,
        kind: e.kind,
        title: e.title,
        description: e.description,
        at: new Date(e.at),
        byOwner: e.byOwner,
      }));

      // Detect new event ids (pour highlight 5s)
      const seen = lastEventIdsRef.current;
      const newIds = new Set<string>();
      for (const e of nextEvents) {
        if (!seen.has(e.id)) newIds.add(e.id);
      }
      lastEventIdsRef.current = new Set(nextEvents.map((e) => e.id));

      setEvents(nextEvents);
      setLastSync(new Date(data.generatedAt));
      setError(false);

      if (newIds.size > 0) {
        setHighlightedIds(newIds);
        // Retirer le highlight après l'anim
        window.setTimeout(() => setHighlightedIds(new Set()), 4000);
      }
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [reportId]);

  useEffect(() => {
    const id = window.setInterval(fetchActivity, pollIntervalMs);
    // Re-sync quand l'onglet redevient visible (économise du fetch en bg)
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchActivity, pollIntervalMs]);

  return (
    <div className="space-y-2">
      <header className="flex items-center justify-between px-1 text-[11px] uppercase tracking-wider">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Radio
            className={`h-3 w-3 ${
              error
                ? "text-sable-400"
                : refreshing
                  ? "animate-pulse text-coral-500"
                  : "text-coral-500"
            }`}
          />
          Flux d&apos;activité
        </span>
        <button
          type="button"
          onClick={fetchActivity}
          disabled={refreshing}
          title="Forcer la mise à jour"
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
          />
          <span className="lowercase">{formatLastSync(lastSync)}</span>
        </button>
      </header>

      <ReportActivityFeed events={events} highlightIds={highlightedIds} />
    </div>
  );
}

function formatLastSync(date: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 5) return "à jour";
  if (sec < 60) return `maj ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `maj ${min}min`;
  return "ancien";
}
