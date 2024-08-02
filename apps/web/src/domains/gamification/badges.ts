/**
 * Gamification — paliers de reconnaissance basés sur le compteur
 * `users.resolved_count` (nombre de retrouvailles confirmées) plus
 * quelques jalons d'activité (premier signalement, première adoption).
 * Voir `docs/GAMIFICATION.md` pour la philosophie.
 *
 * Règles : pas de points, pas de classement public, pas de FOMO.
 * Reconnaissance discrète d'engagements concrets.
 */

export type BadgeTier = "bonne-ame" | "heros" | "sentinelle";

export interface TierConfig {
  tier: BadgeTier;
  threshold: number;
  label: string;
  description: string;
  // Couleurs Tailwind déjà dans la palette
  bg: string;
  text: string;
  border: string;
}

export const TIERS: TierConfig[] = [
  {
    tier: "bonne-ame",
    threshold: 1,
    label: "Bonne âme",
    description: "A contribué à une première retrouvaille.",
    bg: "bg-coral-50",
    text: "text-coral-700",
    border: "border-coral-200",
  },
  {
    tier: "heros",
    threshold: 3,
    label: "Héros du quartier",
    description: "A aidé à rendre 3 animaux à leur famille.",
    bg: "bg-lavande-100",
    text: "text-lavande-800",
    border: "border-lavande-300",
  },
  {
    tier: "sentinelle",
    threshold: 10,
    label: "Sentinelle",
    description: "A participé à 10 retrouvailles confirmées. Titre rare.",
    bg: "bg-prune-100",
    text: "text-prune-800",
    border: "border-prune-300",
  },
];

export function getBadgeTier(count: number): TierConfig | null {
  // Retourne le palier le plus haut atteint
  const reached = TIERS.filter((t) => count >= t.threshold);
  return reached[reached.length - 1] ?? null;
}

/** Libellé "3 retrouvailles" / "1 retrouvaille" pour affichage. */
export function resolvedLabel(count: number): string {
  if (count === 0) return "Aucune retrouvaille encore";
  if (count === 1) return "1 retrouvaille";
  return `${count} retrouvailles`;
}

// ─── Badges "milestones" (jalons d'activité) ──────────────────────────────

export type MilestoneBadge =
  | "eclaireur"
  | "famille"
  | "bonne-ame"
  | "heros"
  | "sentinelle";

export interface MilestoneConfig {
  key: MilestoneBadge;
  label: string;
  description: string;
  icon: "shield" | "home-heart" | "medal" | "compass";
  bg: string;
  text: string;
  border: string;
}

/**
 * Catalogue de badges affichables. Pas de table dédiée — chaque badge est
 * dérivé d'un signal métier (count de retrouvailles, count de signalements
 * actifs, count d'adoptions). Voir `getUserBadges()` côté query pour la
 * dérivation à partir des données utilisateur.
 */
export const MILESTONE_BADGES: Record<MilestoneBadge, MilestoneConfig> = {
  "bonne-ame": {
    key: "bonne-ame",
    label: "Bonne âme",
    description: "A contribué à une première retrouvaille.",
    icon: "medal",
    bg: "bg-coral-50",
    text: "text-coral-700",
    border: "border-coral-200",
  },
  heros: {
    key: "heros",
    label: "Héros du quartier",
    description: "A aidé à rendre 3 animaux à leur famille.",
    icon: "medal",
    bg: "bg-lavande-100",
    text: "text-lavande-800",
    border: "border-lavande-300",
  },
  sentinelle: {
    key: "sentinelle",
    label: "Sentinelle",
    description: "10 retrouvailles confirmées — un pilier de la communauté.",
    icon: "shield",
    bg: "bg-prune-100",
    text: "text-prune-800",
    border: "border-prune-300",
  },
  eclaireur: {
    key: "eclaireur",
    label: "Éclaireur",
    description:
      "A déposé 5 signalements ou plus — la communauté garde l'œil ouvert grâce à vous.",
    icon: "compass",
    bg: "bg-sable-100",
    text: "text-foreground",
    border: "border-sable-300",
  },
  famille: {
    key: "famille",
    label: "Famille",
    description:
      "A adopté un animal via Dorloter. Bienvenue à la maison, le compagnon.",
    icon: "home-heart",
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
  },
};
