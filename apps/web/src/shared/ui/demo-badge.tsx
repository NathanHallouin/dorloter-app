import { FlaskConical } from "lucide-react";
import { cn } from "@shared/utils";

interface DemoBadgeProps {
  /** Variante d'affichage selon le contexte. */
  variant?: "default" | "compact" | "banner";
  className?: string;
}

/**
 * Badge "Données de test" affiché sur toute entité créée pour démo
 * (signalements, refuges, pensions, cabinets vétos, animaux à adopter).
 * Indique clairement à l'utilisateur que ce contenu n'est pas une
 * vraie annonce — important tant que le prototype est en ligne avec
 * vraies données et données de test mélangées.
 *
 * - `default` : pill amber compact pour cards/listings
 * - `compact` : très petit, pour les coins de card avec peu d'espace
 * - `banner` : barre pleine largeur pour le haut d'une page détail
 */
export function DemoBadge({
  variant = "default",
  className,
}: DemoBadgeProps) {
  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900",
          className
        )}
        role="note"
      >
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold">Donnée de test</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Cette fiche a été créée pour tester le proto Dorloter. Elle ne
            correspond à aucune annonce réelle.
          </p>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <span
        title="Donnée de test, créée pour le proto Dorloter."
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800",
          className
        )}
      >
        <FlaskConical className="h-2.5 w-2.5" />
        Test
      </span>
    );
  }

  return (
    <span
      title="Donnée de test, créée pour le proto Dorloter."
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800",
        className
      )}
    >
      <FlaskConical className="h-3 w-3" />
      Donnée de test
    </span>
  );
}
