export type VolunteerStatus =
  | "candidature"
  | "active"
  | "pause"
  | "refusee"
  | "archive";

export const VOLUNTEER_STATUS_LABELS: Record<VolunteerStatus, string> = {
  candidature: "Candidature",
  active: "Actif",
  pause: "En pause",
  refusee: "Refusée",
  archive: "Archivé",
};

export const VOLUNTEER_STATUS_CLASSES: Record<
  VolunteerStatus,
  { bg: string; text: string }
> = {
  candidature: { bg: "bg-amber-100", text: "text-amber-800" },
  active: { bg: "bg-emerald-100", text: "text-emerald-800" },
  pause: { bg: "bg-sable-100", text: "text-sable-800" },
  refusee: { bg: "bg-rose-100", text: "text-rose-800" },
  archive: { bg: "bg-muted", text: "text-muted-foreground" },
};

export type ShiftStatus = "ouvert" | "complet" | "annule" | "termine";

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  ouvert: "Ouvert",
  complet: "Complet",
  annule: "Annulé",
  termine: "Terminé",
};

export const SHIFT_STATUS_CLASSES: Record<
  ShiftStatus,
  { bg: string; text: string }
> = {
  ouvert: { bg: "bg-coral-50", text: "text-coral-700" },
  complet: { bg: "bg-emerald-100", text: "text-emerald-800" },
  annule: { bg: "bg-rose-100", text: "text-rose-800" },
  termine: { bg: "bg-sable-100", text: "text-sable-800" },
};

export type ShiftSignupStatus =
  | "inscrit"
  | "confirme"
  | "annule"
  | "absent"
  | "termine";

export const SHIFT_SIGNUP_STATUS_LABELS: Record<ShiftSignupStatus, string> = {
  inscrit: "Inscrit",
  confirme: "Confirmé",
  annule: "Annulé",
  absent: "Absent",
  termine: "Effectué",
};

export interface Volunteer {
  id: string;
  userId: string;
  shelterId: string;
  status: VolunteerStatus;
  skills: string | null;
  availability: string | null;
  motivation: string;
  phone: string | null;
  shelterNotes: string | null;
  validatedAt: Date | null;
  rejectedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VolunteerWithUser extends Volunteer {
  userName: string;
  userEmail: string;
  shelterName: string;
  shelterSlug: string;
  /** Total des heures effectuées (cumul des signups "termine"). */
  totalHours: number;
  /** Nombre de créneaux à venir. */
  upcomingShiftsCount: number;
}

export interface Shift {
  id: string;
  shelterId: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  status: ShiftStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftWithSignups extends Shift {
  shelterName: string;
  shelterSlug: string;
  signedUpCount: number;
  /** Indique si l'utilisateur connecté est déjà inscrit. */
  isCurrentUserSignedUp: boolean;
  currentUserSignupId: string | null;
}

export interface ShiftSignup {
  id: string;
  shiftId: string;
  volunteerId: string;
  shelterId: string;
  status: ShiftSignupStatus;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftSignupWithContext extends ShiftSignup {
  volunteerName: string;
  volunteerEmail: string;
  shiftTitle: string;
  shiftStartsAt: Date;
  shiftEndsAt: Date;
}

/** Calcule la durée d'un signup en heures (0 si non check-out). */
export function signupHours(signup: {
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): number {
  if (!signup.checkInAt || !signup.checkOutAt) return 0;
  const ms = signup.checkOutAt.getTime() - signup.checkInAt.getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / 3600000) * 10) / 10;
}
