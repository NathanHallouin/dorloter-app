/**
 * Couleurs des tags refuge : map enum → classes Tailwind cohérentes
 * avec la palette du site (coral, lavande, ambre, prune, sable + bleu/vert
 * pour neutralité/positivité).
 */

export type TagColor =
  | "coral"
  | "lavande"
  | "ambre"
  | "vert"
  | "bleu"
  | "prune"
  | "sable";

export const TAG_COLORS: readonly TagColor[] = [
  "coral",
  "lavande",
  "ambre",
  "vert",
  "bleu",
  "prune",
  "sable",
];

export const TAG_COLOR_CLASSES: Record<
  TagColor,
  { bg: string; text: string; border: string }
> = {
  coral: {
    bg: "bg-coral-100",
    text: "text-coral-800",
    border: "border-coral-300",
  },
  lavande: {
    bg: "bg-lavande-100",
    text: "text-lavande-800",
    border: "border-lavande-300",
  },
  ambre: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  vert: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  bleu: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  prune: {
    bg: "bg-prune-100",
    text: "text-prune-800",
    border: "border-prune-300",
  },
  sable: {
    bg: "bg-sable-200",
    text: "text-sable-800",
    border: "border-sable-300",
  },
};

export const TAG_COLOR_LABELS: Record<TagColor, string> = {
  coral: "Corail",
  lavande: "Lavande",
  ambre: "Ambre",
  vert: "Vert",
  bleu: "Bleu",
  prune: "Prune",
  sable: "Sable",
};
