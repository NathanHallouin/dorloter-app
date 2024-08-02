"use client";

import Link from "next/link";
import { LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@shared/utils";

/**
 * Toggle Liste / Swipe en haut des pages catalogue. Reste visible sur les
 * deux modes : on indique l'actif via aria-current et on conserve les
 * filtres d'URL en passant par un Link régulier.
 *
 * Le mode "Liste" est l'entrée principale (filtres, pagination, persistance
 * via URL) ; "Swipe" reste pour ceux qui aiment l'expérience ludique.
 */
export function CatalogModeToggle({
  mode,
  listHref = "/adopter/liste",
  swipeHref = "/adopter",
  className,
}: {
  mode: "list" | "swipe";
  listHref?: string;
  swipeHref?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Mode d'affichage"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-border bg-card p-1 shadow-sm",
        className
      )}
    >
      <Link
        href={listHref}
        role="tab"
        aria-selected={mode === "list"}
        aria-current={mode === "list" ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
          mode === "list"
            ? "bg-coral-500 text-white shadow-sm"
            : "text-foreground hover:bg-muted"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Liste
      </Link>
      <Link
        href={swipeHref}
        role="tab"
        aria-selected={mode === "swipe"}
        aria-current={mode === "swipe" ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
          mode === "swipe"
            ? "bg-coral-500 text-white shadow-sm"
            : "text-foreground hover:bg-muted"
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Swipe
      </Link>
    </div>
  );
}
