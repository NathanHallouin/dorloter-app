import type { TagColor } from "./tag-colors";

/**
 * Type structurel d'un tag refuge, extrait des queries pour réutilisation
 * côté client sans tirer `@infra/db` dans le bundle browser.
 */
export interface ShelterTag {
  id: string;
  shelterId: string;
  name: string;
  color: TagColor;
  isPublic: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
