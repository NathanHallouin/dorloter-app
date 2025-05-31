import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { contractsApi } from "@dorloter/client";
import { clausesFor } from "./contract-clauses";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "……";

/** Document imprimable d'un contrat (adoption / convention d'accueil). */
export function ContractDocumentPage() {
  const { id = "" } = useParams();
  const { data: c, isLoading, isError } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => contractsApi.get(id),
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-neutral-500">Chargement…</div>;
  if (isError || !c) return <div className="grid min-h-screen place-items-center text-neutral-500">Contrat introuvable.</div>;

  const isAdoption = c.type === "adoption";
  const title = isAdoption ? "Contrat d'adoption" : "Convention de famille d'accueil";
  const counterpartyLabel = isAdoption ? "L'adoptant·e" : "La famille d'accueil";
  const clauses = clausesFor(c.type);
  const terms = c.terms ?? {};

  return (
    <div className="min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      {/* Barre d'actions (masquée à l'impression) */}
      <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4 print:hidden">
        <a href="/refuge/contrats" className="text-sm text-neutral-600 hover:underline">← Retour aux contrats</a>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-coral-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Imprimer / PDF
        </button>
      </div>

      {/* Feuille A4 */}
      <article className="mx-auto max-w-[820px] bg-white px-12 py-12 text-[13.5px] leading-relaxed text-neutral-900 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-8 flex items-start justify-between border-b border-neutral-300 pb-4">
          <div>
            <div className="font-display text-xl font-semibold">{c.shelterName ?? "Refuge"}</div>
            <div className="text-xs text-neutral-500">Association de protection animale</div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div className="font-mono">{c.reference}</div>
            <div>Le {fmtDate(c.effectiveDate ?? c.createdAt)}</div>
          </div>
        </header>

        <h1 className="mb-6 text-center font-display text-2xl font-semibold uppercase tracking-wide">{title}</h1>

        <section className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Le refuge</div>
            <div>{c.shelterName ?? "……"}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{counterpartyLabel}</div>
            <div>{c.adopterName ?? "……"}</div>
            {c.adopterEmail && <div className="text-neutral-500">{c.adopterEmail}</div>}
          </div>
        </section>

        <section className="mb-6 rounded border border-neutral-200 bg-neutral-50 p-4">
          <div className="grid grid-cols-2 gap-y-1">
            <span className="text-neutral-500">Animal concerné</span>
            <span className="font-medium">{c.petName ?? "……"}</span>
            {isAdoption && (
              <>
                <span className="text-neutral-500">Frais d'adoption</span>
                <span className="font-medium">{c.adoptionFee != null ? `${c.adoptionFee} €` : "……"}</span>
              </>
            )}
            <span className="text-neutral-500">{isAdoption ? "Date d'adoption" : "Début de l'accueil"}</span>
            <span className="font-medium">{fmtDate(c.effectiveDate)}</span>
            {!isAdoption && (
              <>
                <span className="text-neutral-500">Fin prévue</span>
                <span className="font-medium">{c.endDate ? fmtDate(c.endDate) : "jusqu'à l'adoption"}</span>
              </>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 font-display text-base font-semibold">Engagements</h2>
          <ul className="space-y-1.5">
            {clauses.map((cl) => {
              const on = Boolean(terms[cl.key]);
              return (
                <li key={cl.key} className="flex gap-2">
                  <span className="mt-0.5 font-mono">{on ? "[x]" : "[ ]"}</span>
                  <span className={on ? "" : "text-neutral-400"}>{cl.label}</span>
                </li>
              );
            })}
          </ul>
          {c.notes && (
            <p className="mt-4 whitespace-pre-line border-l-2 border-neutral-300 pl-3 text-neutral-700">{c.notes}</p>
          )}
        </section>

        <section className="mt-12 grid grid-cols-2 gap-10">
          <div>
            <div className="mb-10 text-xs font-semibold uppercase tracking-wide text-neutral-500">Pour le refuge</div>
            <div className="border-t border-neutral-400 pt-1 text-xs text-neutral-500">Nom, date et signature</div>
          </div>
          <div>
            <div className="mb-10 text-xs font-semibold uppercase tracking-wide text-neutral-500">{counterpartyLabel}</div>
            <div className="border-t border-neutral-400 pt-1 text-xs text-neutral-500">Nom, date et signature</div>
          </div>
        </section>
      </article>
    </div>
  );
}
