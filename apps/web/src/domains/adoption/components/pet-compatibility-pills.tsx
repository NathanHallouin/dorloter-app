import { Baby, Cat, Dog } from "lucide-react";
import { cn } from "@shared/utils";

type CompatValue = "oui" | "non" | "inconnu";

interface PetCompatibilityPillsProps {
  okWithCats: CompatValue;
  okWithDogs: CompatValue;
  okWithChildren: CompatValue;
  className?: string;
  /** Si true, on rend les "non" / "inconnu" en mode discret (gris). */
  hideNegatives?: boolean;
}

/**
 * Pictos colorés au-dessus du fold sur la fiche animal — décision en 3 sec.
 *
 * - Vert quand compatible (oui)
 * - Rouge discret quand explicitement non (non)
 * - Gris pour "inconnu" — rendu seulement si hideNegatives=false
 *
 * Les libellés sont lisibles par lecteurs d'écran (titre + aria-label).
 */
export function PetCompatibilityPills({
  okWithCats,
  okWithDogs,
  okWithChildren,
  hideNegatives = false,
  className,
}: PetCompatibilityPillsProps) {
  const items: {
    value: CompatValue;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: okWithCats,
      label: "chats",
      icon: <Cat className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      value: okWithDogs,
      label: "chiens",
      icon: <Dog className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      value: okWithChildren,
      label: "enfants",
      icon: <Baby className="h-3.5 w-3.5" aria-hidden />,
    },
  ];

  const visible = hideNegatives
    ? items.filter((it) => it.value === "oui")
    : items;

  if (visible.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap gap-1.5", className)}
      aria-label="Compatibilités"
    >
      {visible.map((it) => (
        <li key={it.label}>
          <Pill value={it.value} label={it.label} icon={it.icon} />
        </li>
      ))}
    </ul>
  );
}

function Pill({
  value,
  label,
  icon,
}: {
  value: CompatValue;
  label: string;
  icon: React.ReactNode;
}) {
  const text =
    value === "oui"
      ? `OK ${label}`
      : value === "non"
        ? `Sans ${label}`
        : `${label} ?`;

  const tone =
    value === "oui"
      ? "border-green-200 bg-green-50 text-green-800"
      : value === "non"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-border bg-muted text-muted-foreground";

  const aria =
    value === "oui"
      ? `Compatible avec les ${label}`
      : value === "non"
        ? `Pas compatible avec les ${label}`
        : `Compatibilité avec les ${label} inconnue`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone
      )}
      title={aria}
    >
      {icon}
      {text}
    </span>
  );
}
