export type FosterFamilyStatus =
  | "candidature"
  | "active"
  | "pause"
  | "refusee"
  | "archive";

export const FOSTER_FAMILY_STATUS_LABELS: Record<FosterFamilyStatus, string> = {
  candidature: "Candidature",
  active: "Active",
  pause: "En pause",
  refusee: "Refusée",
  archive: "Archivée",
};

export const FOSTER_FAMILY_STATUS_CLASSES: Record<
  FosterFamilyStatus,
  { bg: string; text: string }
> = {
  candidature: { bg: "bg-amber-100", text: "text-amber-800" },
  active: { bg: "bg-emerald-100", text: "text-emerald-800" },
  pause: { bg: "bg-sable-100", text: "text-sable-800" },
  refusee: { bg: "bg-rose-100", text: "text-rose-800" },
  archive: { bg: "bg-muted", text: "text-muted-foreground" },
};

export type FosterPlacementStatus =
  | "planifie"
  | "en_cours"
  | "termine"
  | "annule";

export const FOSTER_PLACEMENT_STATUS_LABELS: Record<
  FosterPlacementStatus,
  string
> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

export const FOSTER_PLACEMENT_STATUS_CLASSES: Record<
  FosterPlacementStatus,
  { bg: string; text: string }
> = {
  planifie: { bg: "bg-lavande-100", text: "text-lavande-800" },
  en_cours: { bg: "bg-emerald-100", text: "text-emerald-800" },
  termine: { bg: "bg-sable-100", text: "text-sable-800" },
  annule: { bg: "bg-rose-100", text: "text-rose-800" },
};

export interface FosterFamily {
  id: string;
  userId: string;
  shelterId: string;
  status: FosterFamilyStatus;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  maxCapacity: number;
  hasGarden: boolean;
  hasOtherPets: boolean;
  otherPetsDescription: string | null;
  hasChildren: boolean;
  childrenAges: string | null;
  experience: string | null;
  motivation: string;
  address: string | null;
  phone: string | null;
  shelterNotes: string | null;
  validatedAt: Date | null;
  rejectedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FosterFamilyWithUser extends FosterFamily {
  userName: string;
  userEmail: string;
  shelterName: string;
  shelterSlug: string;
  /** Nombre de placements actuellement en cours pour cette FA. */
  activePlacementsCount: number;
}

export interface FosterPlacement {
  id: string;
  petId: string;
  fosterFamilyId: string;
  shelterId: string;
  status: FosterPlacementStatus;
  startDate: string;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  reason: string | null;
  shelterNotes: string | null;
  fosterFeedback: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FosterPlacementWithContext extends FosterPlacement {
  petName: string;
  petSpecies: "chat" | "chien";
  petPrimaryPhotoUrl: string | null;
  fosterUserName: string;
  fosterUserEmail: string | null;
  shelterName: string;
}
