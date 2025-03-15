/**
 * Types et libellés des documents refuge. Extraits pour usage côté
 * client sans tirer la DB.
 */

export type DocumentKind =
  | "contrat_adoption"
  | "statuts_association"
  | "agrement"
  | "convention"
  | "charte_visite"
  | "autre";

export type DocumentVisibility = "public" | "internal";

export const DOCUMENT_KINDS: readonly DocumentKind[] = [
  "contrat_adoption",
  "statuts_association",
  "agrement",
  "convention",
  "charte_visite",
  "autre",
];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  contrat_adoption: "Contrat d'adoption type",
  statuts_association: "Statuts d'association",
  agrement: "Agrément préfectoral",
  convention: "Convention",
  charte_visite: "Charte de visite",
  autre: "Autre",
};

export interface ShelterDocument {
  id: string;
  shelterId: string;
  uploadedByUserId: string;
  kind: DocumentKind;
  title: string;
  description: string | null;
  fileUrl: string;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  visibility: DocumentVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
