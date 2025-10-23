/**
 * Scoring de correspondance perdu/trouvé (0-100). Logique pure, sans base :
 * distance 40 + couleur 25 + race 15 + sexe 10 + fenêtre temporelle 10.
 */

export const MIN_SCORE = 40;
export const MAX_DISTANCE_METERS = 30_000;

/** Distance (40 pts max) : < 1 km = 40, < 5 km = 30, < 15 km = 20, < 30 km = 10. */
export function scoreDistance(meters: number): number {
  if (meters < 1_000) return 40;
  if (meters < 5_000) return 30;
  if (meters < 15_000) return 20;
  if (meters < 30_000) return 10;
  return 0;
}

/** Couleur (25 pts max) : exacte = 25, mot commun (>= 3 caractères) = 15. */
export function scoreColor(a: string | null, b: string | null): number {
  const x = normalize(a);
  const y = normalize(b);
  if (x === '' || y === '') return 0;
  if (x === y) return 25;
  const tokensX = tokens(x);
  return [...tokens(y)].some((token) => tokensX.has(token)) ? 15 : 0;
}

/** Race (15 pts max) : exacte = 15, « inconnu » des deux côtés = 5 (neutre). */
export function scoreBreed(a: string | null, b: string | null): number {
  const x = normalize(a);
  const y = normalize(b);
  const xUnknown = x === '' || x === 'inconnu';
  const yUnknown = y === '' || y === 'inconnu';
  if (xUnknown && yUnknown) return 5;
  if (x === '' || y === '') return 0;
  return x === y ? 15 : 0;
}

/** Sexe (10 pts max) : égal = 10, « inconnu » = 5. */
export function scoreSex(a: string, b: string): number {
  if (a === 'inconnu' || b === 'inconnu') return 5;
  return a === b ? 10 : 0;
}

/**
 * Fenêtre temporelle (10 pts max) : trouvé >= perdu et écart < 7 j = 10,
 * < 14 j = 7, < 30 j = 3. Les dates sont des dates civiles `yyyy-mm-dd`.
 */
export function scoreDateWindow(lost: string, found: string): number {
  const days = daysBetween(lost, found);
  if (days < 0) return 0;
  if (days < 7) return 10;
  if (days < 14) return 7;
  if (days < 30) return 3;
  return 0;
}

/** Éléments de scoring d'un signalement. */
export interface ScorableReport {
  color: string | null;
  breed: string | null;
  sex: string;
  date_event: string;
}

/** Score total. `lost` est toujours le signalement « perdu ». */
export function totalScore(
  lost: ScorableReport,
  found: ScorableReport,
  distanceMeters: number,
): number {
  return (
    scoreDistance(distanceMeters) +
    scoreColor(lost.color, found.color) +
    scoreBreed(lost.breed, found.breed) +
    scoreSex(lost.sex, found.sex) +
    scoreDateWindow(lost.date_event, found.date_event)
  );
}

function normalize(value: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .split(/[ ,;/\-\t\n]/)
      .filter((token) => token.length >= 3),
  );
}

/** Écart en jours entre deux dates civiles `yyyy-mm-dd`. */
function daysBetween(from: string, to: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}
