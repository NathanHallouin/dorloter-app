/**
 * Types des recherches sauvegardées extraits pour réutilisation côté
 * client sans tirer `@infra/db` dans le bundle browser.
 */

export type SavedSearchKind = "adoption" | "lost-found";

export interface SavedSearch {
  id: string;
  userId: string;
  kind: SavedSearchKind;
  name: string;
  params: Record<string, unknown>;
  isActive: boolean;
  /** Mode guetteur : push instantané sur match (uniquement lost-found). */
  pushEnabled: boolean;
  lastNotifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
