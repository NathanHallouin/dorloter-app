import { Compass, Home, Medal, Shield } from "lucide-react";
import { cn } from "@shared/utils";
import type { MilestoneConfig } from "../badges";

const ICONS = {
  shield: Shield,
  "home-heart": Home,
  medal: Medal,
  compass: Compass,
};

/**
 * Collection de badges affichée sur le profil. Si l'utilisateur n'en a
 * encore aucun, on affiche un placeholder amical qui explique comment
 * en débloquer — pas de pression, juste un guide.
 */
export function UserBadgesGrid({ badges }: { badges: MilestoneConfig[] }) {
  if (badges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm">
        <p className="font-medium text-foreground">
          Aucun badge pour l&apos;instant · pas de panique
        </p>
        <p className="mt-1 text-muted-foreground">
          Les badges arrivent au fil de votre engagement : un signalement, une
          adoption, ou une retrouvaille confirmée.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {badges.map((b) => {
        const Icon = ICONS[b.icon];
        return (
          <li
            key={b.key}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4",
              b.bg,
              b.border
            )}
          >
            <span
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70",
                b.text
              )}
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold", b.text)}>{b.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {b.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
