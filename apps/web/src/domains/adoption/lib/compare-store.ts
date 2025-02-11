/**
 * Store du comparateur d'animaux à adopter — purement côté navigateur
 * (localStorage + window event). Stocke `{ id, name }` pour pouvoir
 * afficher des libellés humains dans la barre flottante sans devoir
 * re-fetcher les pets.
 *
 * Limite : 3 animaux max. Les composants écoutent l'événement custom
 * "pet-compare:change" pour rester synchronisés sans React Context.
 */

const STORAGE_KEY = "dorloter:pets-compare";
export const COMPARE_MAX = 3;
export const COMPARE_EVENT = "pet-compare:change";

export interface ComparePetEntry {
  id: string;
  name: string;
}

function safeReadAll(): ComparePetEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ComparePetEntry =>
        x &&
        typeof x === "object" &&
        typeof x.id === "string" &&
        typeof x.name === "string"
    );
  } catch {
    return [];
  }
}

function persist(entries: ComparePetEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(COMPARE_EVENT));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function getCompareList(): ComparePetEntry[] {
  return safeReadAll();
}

export function isInCompare(id: string): boolean {
  return safeReadAll().some((e) => e.id === id);
}

export function toggleCompare(
  entry: ComparePetEntry
): { ok: boolean; result: "added" | "removed" | "full" } {
  const current = safeReadAll();
  if (current.some((e) => e.id === entry.id)) {
    persist(current.filter((e) => e.id !== entry.id));
    return { ok: true, result: "removed" };
  }
  if (current.length >= COMPARE_MAX) return { ok: false, result: "full" };
  persist([...current, entry]);
  return { ok: true, result: "added" };
}

export function removeFromCompare(id: string) {
  const current = safeReadAll();
  if (!current.some((e) => e.id === id)) return;
  persist(current.filter((e) => e.id !== id));
}

export function clearCompare() {
  persist([]);
}

import { useEffect, useState } from "react";

export function useCompareList(): ComparePetEntry[] {
  const [list, setList] = useState<ComparePetEntry[]>([]);

  useEffect(() => {
    setList(safeReadAll());
    const onChange = () => setList(safeReadAll());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setList(safeReadAll());
    };
    window.addEventListener(COMPARE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COMPARE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return list;
}
