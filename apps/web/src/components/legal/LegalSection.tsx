import type { ReactNode } from "react";

/**
 * Section numérotée d'un document légal. Le style du corps de texte est porté
 * ici pour que les pages restent du contenu presque pur.
 */
export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.01em] text-foreground">
        <span className="mono mr-2.5 text-[13px] font-medium text-coral-600">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      {/* Les liens portent la classe `inline-link` du thème (cf. theme.css) :
          des utilitaires Tailwind seraient écrasés par le reset `a`. */}
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-[1.7] text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}
