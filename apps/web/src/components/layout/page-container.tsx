import { cn } from "@shared/utils";

/**
 * Conteneur de page standardisé. 3 variantes sémantiques pour garder une
 * cohérence visuelle à travers toute la plateforme — voir le décision log
 * dans ce commentaire pour éviter la divergence :
 *
 * - `narrow` (2xl / 672px) : formulaires simples et pages single-topic
 *   (profil, signalement, candidature, invitation…). Forcer moins large
 *   donne une ligne de lecture confortable et centre mieux l'attention.
 *
 * - `stream` (3xl / 768px) : listes verticales de cards — messages,
 *   notifications, candidatures, signalements perso. Entre une colonne
 *   confortable et un catalogue large.
 *
 * - `wide` (6xl / 1152px) : catalogues, grilles, pages publiques (adopter,
 *   refuges, perdus-trouvés). Valeur utilisée par le Navbar et les
 *   layouts de route par défaut.
 *
 * Les paddings horizontaux et verticaux sont inclus — pas besoin
 * d'ajouter `px-*` ou `py-*` en dehors.
 */
type Variant = "narrow" | "stream" | "wide";

const VARIANT_CLASSES: Record<Variant, string> = {
  narrow: "max-w-2xl",
  stream: "max-w-3xl",
  wide: "max-w-6xl",
};

export function PageContainer({
  children,
  variant = "stream",
  className,
  as: As = "div",
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  as?: "div" | "main" | "section" | "article";
}) {
  return (
    <As
      className={cn(
        "mx-auto w-full px-4 py-6 md:py-8",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </As>
  );
}
