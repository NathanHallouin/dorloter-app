/**
 * Marqueur visuel pour une information légale que seul l'éditeur peut fournir
 * (raison sociale, adresse du siège, numéro RNA, identité du délégué…).
 *
 * Volontairement voyant : ces pages ne doivent pas partir en production avec
 * des trous. Pour lister ce qu'il reste à remplir :
 *   grep -rn "ToFill" apps/web/src/pages
 */
export function ToFill({ children }: { children: string }) {
  return (
    <mark className="mono rounded-[3px] bg-lavande-100 px-1.5 py-0.5 text-[12.5px] font-medium text-prune-900">
      À COMPLÉTER · {children}
    </mark>
  );
}
