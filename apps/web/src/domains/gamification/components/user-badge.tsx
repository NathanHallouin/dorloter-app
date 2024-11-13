import { Medal } from "lucide-react";
import { getBadgeTier, resolvedLabel } from "@gamification/badges";
import { cn } from "@shared/utils";

/**
 * Affiche le badge de retrouvailles d'un user. Trois variantes :
 *   - "inline"  : petite pastille discrète à côté d'un nom
 *   - "card"    : tuile pleine pour la page /profil
 *   - "compact" : version condensée pour admin tables
 *
 * Retourne null si le user n'a aucune retrouvaille (count=0) — on ne pollue
 * pas l'UI quand il n'y a rien à célébrer.
 */
export function UserBadge({
  count,
  variant = "inline",
  className,
}: {
  count: number;
  variant?: "inline" | "card" | "compact";
  className?: string;
}) {
  if (count <= 0) return null;
  const tier = getBadgeTier(count);

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          tier ? `${tier.border} ${tier.bg}` : "border-border bg-muted/40",
          className
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            tier ? tier.text : "text-muted-foreground",
            tier ? "bg-white/60" : "bg-white/40"
          )}
        >
          <Medal className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          {tier && (
            <div className={cn("text-sm font-semibold", tier.text)}>
              {tier.label}
            </div>
          )}
          <div className="text-lg font-bold text-foreground">
            {resolvedLabel(count)}
          </div>
          {tier && (
            <div className="text-xs text-muted-foreground">
              {tier.description}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
          tier ? `${tier.border} ${tier.bg} ${tier.text}` : "border-border bg-muted text-muted-foreground",
          className
        )}
        title={tier ? `${tier.label} · ${resolvedLabel(count)}` : resolvedLabel(count)}
      >
        <Medal className="h-3 w-3" />
        {count}
      </span>
    );
  }

  // inline (default)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tier ? `${tier.border} ${tier.bg} ${tier.text}` : "border-border bg-muted text-muted-foreground",
        className
      )}
      title={tier?.description ?? resolvedLabel(count)}
    >
      <Medal className="h-3 w-3" />
      {tier?.label ?? resolvedLabel(count)}
    </span>
  );
}
