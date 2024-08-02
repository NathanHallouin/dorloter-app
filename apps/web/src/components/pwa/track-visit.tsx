"use client";

import { useEffect } from "react";

const STORAGE_KEY = "miaou-recent-visits";
const MAX_RECENT = 20;

interface VisitEntry {
  url: string;
  title: string;
  visitedAt: number;
}

/**
 * Enregistre la visite d'une page détail (chat / signalement / refuge)
 * dans localStorage + demande au service worker de la mettre en cache
 * pour accès offline. Usage :
 *
 *   <TrackVisit url={`/adopter/${pet.id}`} title={pet.name} />
 *
 * Dev (pas de SW enregistré) → juste la persistance localStorage.
 */
export function TrackVisit({ url, title }: { url: string; title: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Mise à jour de la liste des visites récentes
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing: VisitEntry[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((v) => v.url !== url);
      const next = [
        { url, title, visitedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage plein / indispo → on passe
    }

    // Demande au service worker de cacher cette page (et sa version RSC si
    // applicable) pour l'accès offline.
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "cache-urls",
        urls: [url],
      });
    }
  }, [url, title]);

  return null;
}

export interface RecentVisit {
  url: string;
  title: string;
  visitedAt: number;
}

export function getRecentVisits(): RecentVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentVisit[]) : [];
  } catch {
    return [];
  }
}
