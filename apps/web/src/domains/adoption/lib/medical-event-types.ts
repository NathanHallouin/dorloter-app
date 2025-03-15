/**
 * Types et libellés des évènements médicaux. Extraits pour réutilisation
 * client-safe (formulaires, badges, timeline).
 */

export type MedicalEventType =
  | "vaccin"
  | "vermifuge"
  | "antiparasitaire"
  | "consultation"
  | "chirurgie"
  | "traitement"
  | "autre";

export const MEDICAL_EVENT_TYPES: readonly MedicalEventType[] = [
  "vaccin",
  "vermifuge",
  "antiparasitaire",
  "consultation",
  "chirurgie",
  "traitement",
  "autre",
];

export const MEDICAL_EVENT_LABELS: Record<MedicalEventType, string> = {
  vaccin: "Vaccin",
  vermifuge: "Vermifuge",
  antiparasitaire: "Antiparasitaire",
  consultation: "Consultation",
  chirurgie: "Chirurgie",
  traitement: "Traitement",
  autre: "Autre",
};

export const MEDICAL_EVENT_COLOR_CLASSES: Record<
  MedicalEventType,
  { bg: string; text: string; border: string; dot: string }
> = {
  vaccin: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  vermifuge: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  antiparasitaire: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  consultation: {
    bg: "bg-lavande-50",
    text: "text-lavande-800",
    border: "border-lavande-200",
    dot: "bg-lavande-500",
  },
  chirurgie: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  traitement: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  autre: {
    bg: "bg-sable-100",
    text: "text-sable-800",
    border: "border-sable-300",
    dot: "bg-sable-500",
  },
};

export interface MedicalEvent {
  id: string;
  petId: string;
  type: MedicalEventType;
  title: string;
  notes: string | null;
  eventDate: string;
  nextReminderAt: string | null;
  vetNameFreeform: string | null;
  attachmentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
