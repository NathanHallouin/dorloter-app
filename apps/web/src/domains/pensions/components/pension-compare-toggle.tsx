"use client";

import { Scale } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/utils";
import {
  COMPARE_MAX,
  toggleCompare,
  useCompareList,
} from "../lib/compare-store";

interface Props {
  slug: string;
  pensionName: string;
}

/**
 * Checkbox/pastille "Comparer" affichée sur les cards. Stockage en
 * localStorage via `compare-store`. Évite de propager un Link parent
 * (stopPropagation + preventDefault) puisqu'il y a un Link sur la card.
 */
export function PensionCompareToggle({ slug, pensionName }: Props) {
  const list = useCompareList();
  const checked = list.includes(slug);
  const full = list.length >= COMPARE_MAX && !checked;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = toggleCompare(slug);
    if (!res.ok && res.result === "full") {
      toast.error(
        `Vous comparez déjà ${COMPARE_MAX} pensions. Retirez-en une pour en ajouter une autre.`
      );
      return;
    }
    if (res.result === "added") {
      toast.success(`${pensionName} ajoutée au comparateur`, {
        duration: 2000,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={checked}
      disabled={full}
      title={
        full
          ? "Limite de 3 atteinte"
          : checked
            ? "Retirer du comparateur"
            : "Ajouter au comparateur"
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur transition",
        checked
          ? "border-coral-300 bg-coral-500 text-white"
          : full
            ? "cursor-not-allowed border-border bg-white/85 text-muted-foreground opacity-60"
            : "border-border bg-white/85 text-foreground hover:border-coral-300 hover:bg-coral-50",
        "dark:bg-card/85"
      )}
    >
      <Scale className="h-3 w-3" />
      {checked ? "Comparé" : "Comparer"}
    </button>
  );
}
