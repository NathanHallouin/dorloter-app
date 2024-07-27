/**
 * Store du comparateur de pensions — purement côté navigateur (localStorage
 * + window event). Chaque slug ajouté est conservé jusqu'au reset par
 * l'utilisateur ou un toggle off.
 *
 * Limite : 3 pensions max (au-delà, on rejette l'ajout). Les composants
 * écoutent l'événement custom "pension-compare:change" pour rester
 * synchronisés sans avoir besoin de Context React.
 */

const STORAGE_KEY = "dorloter:pensions-compare";
export const COMPARE_MAX = 3;
export const COMPARE_EVENT = "pension-compare:change";

function safeReadAll(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function persist(slugs: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    window.dispatchEvent(new CustomEvent(COMPARE_EVENT));
  } catch {
    // ignore quota / privacy mode
  }
}

export function getCompareList(): string[] {
  return safeReadAll();
}

export function isInCompare(slug: string): boolean {
  return safeReadAll().includes(slug);
}

/**
 * Tente d'ajouter un slug. Retourne :
 *   - "added" si OK
 *   - "already" si déjà présent
 *   - "full" si la limite est atteinte
 */
export function addToCompare(slug: string): "added" | "already" | "full" {
  const current = safeReadAll();
  if (current.includes(slug)) return "already";
  if (current.length >= COMPARE_MAX) return "full";
  persist([...current, slug]);
  return "added";
}

export function removeFromCompare(slug: string) {
  const current = safeReadAll();
  if (!current.includes(slug)) return;
  persist(current.filter((s) => s !== slug));
}

export function toggleCompare(
  slug: string
): { ok: boolean; result: "added" | "removed" | "full" } {
  const current = safeReadAll();
  if (current.includes(slug)) {
    persist(current.filter((s) => s !== slug));
    return { ok: true, result: "removed" };
  }
  if (current.length >= COMPARE_MAX) return { ok: false, result: "full" };
  persist([...current, slug]);
  return { ok: true, result: "added" };
}

export function clearCompare() {
  persist([]);
}

/**
 * Hook léger pour les composants client : retourne la liste courante,
 * resync au montage + sur événement custom + sur `storage` (autres onglets).
 */
import { useEffect, useState } from "react";

export function useCompareList(): string[] {
  const [list, setList] = useState<string[]>([]);

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
