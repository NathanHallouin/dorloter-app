/**
 * Types purement structurels des templates de réponse. Séparés des queries
 * pour pouvoir être réutilisés côté client sans tirer `@infra/db` dans
 * le bundle browser.
 */

export type ResponseTemplateKind =
  | "acceptation"
  | "refus"
  | "demande_infos"
  | "rdv"
  | "generique";

export interface ResponseTemplate {
  id: string;
  shelterId: string;
  name: string;
  kind: ResponseTemplateKind;
  body: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
