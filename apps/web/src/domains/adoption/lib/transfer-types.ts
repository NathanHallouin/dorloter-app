/**
 * Types et libellés des transferts inter-refuges. Extraits pour
 * réutilisation client-safe.
 */

export type PetTransferStatus =
  | "en_attente"
  | "accepte"
  | "refuse"
  | "annule";

export const TRANSFER_STATUSES: readonly PetTransferStatus[] = [
  "en_attente",
  "accepte",
  "refuse",
  "annule",
];

export const TRANSFER_STATUS_LABELS: Record<PetTransferStatus, string> = {
  en_attente: "En attente",
  accepte: "Accepté",
  refuse: "Refusé",
  annule: "Annulé",
};

export const TRANSFER_STATUS_CLASSES: Record<
  PetTransferStatus,
  { bg: string; text: string }
> = {
  en_attente: { bg: "bg-amber-100", text: "text-amber-800" },
  accepte: { bg: "bg-green-100", text: "text-green-800" },
  refuse: { bg: "bg-rose-100", text: "text-rose-800" },
  annule: { bg: "bg-sable-200", text: "text-sable-800" },
};

export interface PetTransfer {
  id: string;
  petId: string;
  fromShelterId: string;
  toShelterId: string;
  requestedByUserId: string;
  message: string | null;
  status: PetTransferStatus;
  decidedByUserId: string | null;
  decisionNote: string | null;
  requestedAt: Date;
  decidedAt: Date | null;
  updatedAt: Date;
}

export interface PetTransferWithContext extends PetTransfer {
  petName: string;
  petSpecies: "chat" | "chien";
  fromShelterName: string;
  fromShelterSlug: string;
  toShelterName: string;
  toShelterSlug: string;
  requestedByName: string;
}
