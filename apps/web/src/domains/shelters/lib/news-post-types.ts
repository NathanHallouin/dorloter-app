/**
 * Types et constantes pour les actualités refuge. Client-safe.
 */

export type NewsPostType =
  | "adoption"
  | "evenement"
  | "urgence"
  | "temoignage"
  | "autre";

export type NewsPostStatus =
  | "brouillon"
  | "en_attente_modo"
  | "publie"
  | "refuse"
  | "archive";

export const NEWS_POST_TYPES: readonly NewsPostType[] = [
  "adoption",
  "evenement",
  "urgence",
  "temoignage",
  "autre",
];

export const NEWS_POST_TYPE_LABELS: Record<NewsPostType, string> = {
  adoption: "Récit d'adoption",
  evenement: "Événement",
  urgence: "Appel urgent",
  temoignage: "Témoignage",
  autre: "Actualité",
};

export const NEWS_POST_TYPE_CLASSES: Record<
  NewsPostType,
  { bg: string; text: string; dot: string }
> = {
  adoption: {
    bg: "bg-coral-50",
    text: "text-coral-700",
    dot: "bg-coral-500",
  },
  evenement: {
    bg: "bg-lavande-50",
    text: "text-lavande-700",
    dot: "bg-lavande-500",
  },
  urgence: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
  temoignage: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  autre: {
    bg: "bg-sable-100",
    text: "text-sable-800",
    dot: "bg-sable-500",
  },
};

export const NEWS_POST_STATUS_LABELS: Record<NewsPostStatus, string> = {
  brouillon: "Brouillon",
  en_attente_modo: "En attente de modération",
  publie: "Publié",
  refuse: "Refusé",
  archive: "Archivé",
};

export interface NewsPost {
  id: string;
  shelterId: string;
  authorId: string;
  type: NewsPostType;
  status: NewsPostStatus;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  publishedAt: Date | null;
  rejectedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsPostWithShelter extends NewsPost {
  shelterName: string;
  shelterSlug: string;
  shelterIsVerified: boolean;
  shelterCity: string | null;
}
