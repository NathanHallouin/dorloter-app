/**
 * Types et libellés des newsletters refuge. Extrait pour réutilisation
 * client-safe (form, historique).
 */

export type ShelterNewsletterKind =
  | "general"
  | "nouvel_arrivage"
  | "urgence_fa"
  | "appel_dons"
  | "evenement";

export const NEWSLETTER_KINDS: readonly ShelterNewsletterKind[] = [
  "general",
  "nouvel_arrivage",
  "urgence_fa",
  "appel_dons",
  "evenement",
];

export const NEWSLETTER_LABELS: Record<ShelterNewsletterKind, string> = {
  general: "Actualité générale",
  nouvel_arrivage: "Nouvel arrivage",
  urgence_fa: "Urgence FA",
  appel_dons: "Appel aux dons",
  evenement: "Événement",
};

export interface ShelterNewsletter {
  id: string;
  shelterId: string;
  sentByUserId: string;
  kind: ShelterNewsletterKind;
  subject: string;
  body: string;
  recipientCount: number;
  sentAt: Date;
}
