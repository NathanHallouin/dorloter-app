import type { ReactNode } from "react";
import { PageBody, PageHead } from "@dorloter/ui";

/**
 * Gabarit commun aux documents légaux (mentions légales, confidentialité, CGU).
 * Colonne étroite et interlignage généreux : ces pages se lisent, elles ne se
 * survolent pas.
 */
export function LegalDoc({
  crumb,
  title,
  sub,
  updatedAt,
  children,
}: {
  crumb: string;
  title: string;
  sub?: string;
  /** Date de dernière mise à jour, au format lisible (ex. « 11 mars 2026 »). */
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div>
      <PageHead crumb={crumb} title={title} sub={sub} />
      <PageBody width={820}>
        <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Dernière mise à jour · {updatedAt}
        </p>
        <div className="mt-7 flex flex-col gap-8">{children}</div>
      </PageBody>
    </div>
  );
}
