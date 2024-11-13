import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@shared/utils";

interface VerifiedBadgeProps {
  /** Refuge → "Refuge vérifié", Pension → "Agrément vérifié". */
  variant?: "shelter" | "pension";
  /** Style compact (tag flottant sur image) ou défaut (badge inline). */
  size?: "default" | "sm";
  /**
   * Si true, le badge est un lien vers `/verification`. Sinon span statique.
   * Default: true. Désactivable quand le badge est lui-même dans un `<Link>`
   * parent (ex. card cliquable).
   */
  asLink?: boolean;
  className?: string;
}

/**
 * Badge "Refuge vérifié par Dorloter" / "Agrément vérifié", lié à la
 * page d'explication du processus. Visuel cohérent partout : fond vert
 * doux, icône bouclier, texte court.
 */
export function VerifiedBadge({
  variant = "shelter",
  size = "default",
  asLink = true,
  className,
}: VerifiedBadgeProps) {
  const label = variant === "pension" ? "Agrément vérifié" : "Vérifié";
  const fullTitle =
    variant === "pension"
      ? "Pension agréée · comment Dorloter vérifie ?"
      : "Refuge vérifié par Dorloter · comment ?";

  const baseClass = cn(
    "inline-flex items-center gap-1 rounded-full font-semibold transition",
    size === "sm"
      ? "bg-white/95 px-2 py-0.5 text-[11px] text-green-700 shadow-sm backdrop-blur"
      : "bg-green-50 px-2.5 py-0.5 text-xs text-green-700",
    asLink && "hover:bg-green-100",
    className
  );

  const content = (
    <>
      <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </>
  );

  if (!asLink) {
    return <span className={baseClass}>{content}</span>;
  }

  return (
    <Link href="/verification" title={fullTitle} className={baseClass}>
      {content}
    </Link>
  );
}
