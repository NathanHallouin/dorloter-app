"use client";

import Link from "next/link";
import { ArrowRight, Scale, X } from "lucide-react";
import { cn } from "@shared/utils";
import {
  COMPARE_MAX,
  clearCompare,
  removeFromCompare,
  useCompareList,
} from "../lib/compare-store";

/**
 * Bar fixée en bas de page sur le catalogue d'adoption. Affiche les
 * animaux sélectionnés + CTA vers `/adopter/compare?ids=…`.
 * Cachée tant qu'aucun animal n'est sélectionné.
 *
 * `bottom-16` sur mobile pour ne pas masquer la BottomNav.
 */
export function PetCompareBar() {
  const list = useCompareList();
  if (list.length === 0) return null;

  const compareUrl = `/adopter/compare?ids=${list.map((e) => e.id).join(",")}`;
  const canCompare = list.length >= 2;

  return (
    <div
      role="region"
      aria-label="Comparateur d'animaux"
      className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur md:bottom-0"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Scale className="h-4 w-4 text-coral-500" />
            {list.length} / {COMPARE_MAX}
          </span>
          <span className="text-muted-foreground">au comparateur :</span>
          <ul className="flex flex-wrap gap-1.5">
            {list.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => removeFromCompare(entry.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-1 text-xs font-medium text-coral-800 hover:bg-coral-100"
                  aria-label={`Retirer ${entry.name} du comparateur`}
                >
                  {entry.name}
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCompare}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Tout retirer
          </button>
          <Link
            href={compareUrl}
            aria-disabled={!canCompare}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600",
              !canCompare && "pointer-events-none opacity-50"
            )}
          >
            {canCompare ? "Comparer" : "Choisissez-en un autre"}
            {canCompare && <ArrowRight className="h-3.5 w-3.5" />}
          </Link>
        </div>
      </div>
    </div>
  );
}
