import { cn } from "@shared/utils";

/**
 * État vide standardisé pour les listings (annuaires, catalogues, onglets
 * vides). Remplace les bordures dashed et les divs ad-hoc qui divergeaient
 * page par page.
 *
 * Trois variantes :
 *   - default — bloc compact avec icône inline
 *   - illustrated — icône large en cercle pour les pages principales
 *   - inline — pas de bordure, pour les sous-sections
 */
export function EmptyState({
  title,
  hint,
  icon,
  action,
  variant = "default",
  className,
}: {
  title: string | React.ReactNode;
  hint?: string | React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "illustrated" | "inline";
  className?: string;
}) {
  if (variant === "illustrated") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-linear-to-b from-card to-muted/40 p-12 text-center",
          className
        )}
      >
        {icon && (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-coral-50 text-coral-500"
            aria-hidden
          >
            {icon}
          </div>
        )}
        <p className="text-lg font-semibold text-foreground">{title}</p>
        {hint && (
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 py-10 text-center",
          className
        )}
      >
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <p className="text-base font-medium text-foreground">{title}</p>
        {hint && (
          <p className="max-w-md text-sm text-muted-foreground">{hint}</p>
        )}
        {action && <div className="mt-1">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center",
        className
      )}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="text-base font-medium text-foreground">{title}</p>
      {hint && (
        <p className="max-w-md text-sm text-muted-foreground">{hint}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
