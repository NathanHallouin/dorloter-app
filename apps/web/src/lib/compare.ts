import { useSyncExternalStore } from "react";
import type { PetSummary } from "@dorloter/client";

/**
 * Sélection de comparaison d'animaux (côté client uniquement).
 *
 * On stocke un instantané léger de chaque animal (id, nom, espèce, photo) dans
 * localStorage pour afficher les vignettes de la barre sans refetch. La page de
 * comparaison, elle, recharge la fiche complète de chaque animal par son id.
 * Store externe partagé via `useSyncExternalStore` : la card et la barre restent
 * synchronisées quel que soit le composant qui déclenche la sélection.
 */

export interface CompareItem {
  id: string;
  name: string;
  species: string;
  photo: string | null;
}

export const COMPARE_MAX = 4;
const STORAGE_KEY = "dorloter.compare";

function read(): CompareItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

let items: CompareItem[] = read();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota / mode privé : la sélection reste en mémoire pour la session
  }
  listeners.forEach((l) => l());
}

// Synchronisation entre onglets.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      items = read();
      listeners.forEach((l) => l());
    }
  });
}

const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return items;
  },
};

export function toggleCompare(pet: PetSummary): boolean {
  const exists = items.some((i) => i.id === pet.id);
  if (exists) {
    items = items.filter((i) => i.id !== pet.id);
    emit();
    return false;
  }
  if (items.length >= COMPARE_MAX) return false;
  items = [...items, { id: pet.id, name: pet.name, species: pet.species, photo: pet.primaryPhoto?.url ?? null }];
  emit();
  return true;
}

export function removeCompare(id: string) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export function clearCompare() {
  items = [];
  emit();
}

/** Sélection courante (réactive). */
export function useCompare(): CompareItem[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
