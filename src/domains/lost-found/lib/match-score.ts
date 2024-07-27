import type { Report } from "@/types";

/**
 * Logique de scoring de correspondance — pure, sans accès DB.
 * Utilisable côté serveur (matching.ts) ET côté client (composants UI qui
 * affichent le breakdown). N'importe pas `db` ni rien d'autre du backend.
 */

export interface MatchBreakdown {
  distance: number;
  color: number;
  breed: number;
  sex: number;
  dateWindow: number;
}

export const SCORE_MAX = {
  distance: 40,
  color: 25,
  breed: 15,
  sex: 10,
  dateWindow: 10,
} as const;

export const MIN_SCORE = 40;
export const MAX_DISTANCE_METERS = 30_000;

// ─── Sous-scores ──────────────────────────────────────────────────────────

export function scoreDistance(meters: number): number {
  if (meters < 1_000) return 40;
  if (meters < 5_000) return 30;
  if (meters < 15_000) return 20;
  if (meters < 30_000) return 10;
  return 0;
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function scoreColor(a: string | null, b: string | null): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 25;
  // Match partiel : au moins un mot en commun (>= 3 caractères)
  const tokens = (s: string) =>
    s.split(/[\s,;/-]+/).filter((t) => t.length >= 3);
  const ax = new Set(tokens(x));
  const hasOverlap = tokens(y).some((t) => ax.has(t));
  return hasOverlap ? 15 : 0;
}

export function scoreBreed(a: string | null, b: string | null): number {
  const x = normalize(a);
  const y = normalize(b);
  if ((!x || x === "inconnu") && (!y || y === "inconnu")) return 5;
  if (!x || !y) return 0;
  return x === y ? 15 : 0;
}

export function scoreSex(
  a: "male" | "femelle" | "inconnu",
  b: "male" | "femelle" | "inconnu"
): number {
  if (a === "inconnu" || b === "inconnu") return 5;
  return a === b ? 10 : 0;
}

export function scoreDateWindow(lost: Date, found: Date): number {
  if (found < lost) return 0; // impossible : trouvé avant la perte
  const days = (found.getTime() - lost.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return 10;
  if (days < 14) return 7;
  if (days < 30) return 3;
  return 0;
}

// ─── Composition ───────────────────────────────────────────────────────────

export function computeMatchScore(
  lost: Report,
  found: Report,
  distanceMeters: number
): number {
  const b = computeMatchBreakdown(lost, found, distanceMeters);
  return b.distance + b.color + b.breed + b.sex + b.dateWindow;
}

/**
 * Détail des composantes du score d'un match — utilisé par l'UI pour
 * expliquer pourquoi un score est ce qu'il est ("distance, couleur,
 * fenêtre temporelle"). Pas de logique métier additionnelle ici, juste
 * une exposition lisible des sous-scores.
 */
export function computeMatchBreakdown(
  lost: Report,
  found: Report,
  distanceMeters: number
): MatchBreakdown {
  return {
    distance: scoreDistance(distanceMeters),
    color: scoreColor(lost.color, found.color),
    breed: scoreBreed(lost.breed, found.breed),
    sex: scoreSex(lost.sex, found.sex),
    dateWindow: scoreDateWindow(
      new Date(lost.dateEvent),
      new Date(found.dateEvent)
    ),
  };
}

/**
 * Tier basé sur le score total — guide la couleur/le ton de l'UI.
 * "strong" = >= 75 (très probable), "medium" = 55-74, "weak" = 40-54.
 */
export function getScoreTier(score: number): "strong" | "medium" | "weak" {
  if (score >= 75) return "strong";
  if (score >= 55) return "medium";
  return "weak";
}
