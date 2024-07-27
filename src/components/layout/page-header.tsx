import { cn } from "@shared/utils";

/**
 * Header standardisé : h1 + description facultative + slot `actions` à droite.
 *
 * Deux tailles :
 * - `listing` (par défaut) — pour les pages catalogue/annuaire publiques
 *   (`/adopter`, `/refuges`, `/pensions`, `/perdus-trouves`). Plus visible,
 *   signale un point d'entrée.
 * - `detail` — pour les pages d'édition, de profil, d'admin (`/shelter-profil`,
 *   `/admin/*`, `/profil`). Plus discret, l'info est ailleurs dans la page.
 */
type PageHeaderSize = "listing" | "detail";

const TITLE_CLASS: Record<PageHeaderSize, string> = {
  listing: "text-3xl sm:text-4xl font-bold tracking-tight text-foreground",
  detail: "text-2xl md:text-3xl font-bold tracking-tight text-foreground",
};

export function PageHeader({
  title,
  description,
  actions,
  size = "listing",
  className,
}: {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  size?: PageHeaderSize;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 md:mb-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className={TITLE_CLASS[size]}>{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
