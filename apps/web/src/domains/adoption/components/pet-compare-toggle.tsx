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
  petId: string;
  petName: string;
}

/**
 * Checkbox/pastille "Comparer" affichée sur les cards d'animaux.
 * Stockage en localStorage via `compare-store`. preventDefault + stopProp
 * pour ne pas suivre le `Link` parent qui wrap la card.
 */
export function PetCompareToggle({ petId, petName }: Props) {
  const list = useCompareList();
  const checked = list.some((e) => e.id === petId);
  const full = list.length >= COMPARE_MAX && !checked;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = toggleCompare({ id: petId, name: petName });
    if (!res.ok && res.result === "full") {
      toast.error(
        `Vous comparez déjà ${COMPARE_MAX} animaux. Retirez-en un pour en ajouter un autre.`
      );
      return;
    }
    if (res.result === "added") {
      toast.success(`${petName} ajouté·e au comparateur`, {
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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur transition-colors",
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
