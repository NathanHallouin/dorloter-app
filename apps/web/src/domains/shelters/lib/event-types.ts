/**
 * Types d'événements refuge + libellés FR + couleurs cohérentes avec
 * la palette du site.
 */

export type ShelterEventType =
  | "portes_ouvertes"
  | "collecte"
  | "salon"
  | "rencontre"
  | "urgence_appel"
  | "autre";

export const EVENT_TYPES: readonly ShelterEventType[] = [
  "portes_ouvertes",
  "collecte",
  "salon",
  "rencontre",
  "urgence_appel",
  "autre",
];

export const EVENT_TYPE_LABELS: Record<ShelterEventType, string> = {
  portes_ouvertes: "Portes ouvertes",
  collecte: "Collecte",
  salon: "Salon animalier",
  rencontre: "Rencontre avec un animal",
  urgence_appel: "Appel d'urgence",
  autre: "Autre",
};

export const EVENT_TYPE_CLASSES: Record<
  ShelterEventType,
  { bg: string; text: string; border: string }
> = {
  portes_ouvertes: {
    bg: "bg-coral-100",
    text: "text-coral-800",
    border: "border-coral-300",
  },
  collecte: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  salon: {
    bg: "bg-lavande-100",
    text: "text-lavande-800",
    border: "border-lavande-300",
  },
  rencontre: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  urgence_appel: {
    bg: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-300",
  },
  autre: {
    bg: "bg-sable-200",
    text: "text-sable-800",
    border: "border-sable-300",
  },
};

export interface ShelterEvent {
  id: string;
  shelterId: string;
  type: ShelterEventType;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  venueAddress: string | null;
  location: { x: number; y: number } | null;
  externalUrl: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicEvent extends ShelterEvent {
  shelterName: string;
  shelterSlug: string;
  /** Adresse effective (venue ou fallback refuge). */
  effectiveAddress: string | null;
  /** Position effective (venue ou fallback refuge). */
  effectiveLocation: { x: number; y: number } | null;
}
