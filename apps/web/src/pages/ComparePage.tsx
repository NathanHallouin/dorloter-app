import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { petsApi } from "@dorloter/client";
import type { Pet } from "@dorloter/client";
import { Icon } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";
import { useCompare, removeCompare, clearCompare } from "@/lib/compare";

const AGE_LABEL: Record<string, string> = { chaton: "Chaton", jeune: "Jeune", adulte: "Adulte", senior: "Senior" };
const SPECIES_LABEL: Record<string, string> = { chat: "Chat", chien: "Chien" };
const SEX_LABEL: Record<string, string> = { male: "Mâle", femelle: "Femelle", inconnu: "Inconnu" };
const FIV_LABEL: Record<string, string> = {
  negatif: "Négatif",
  fiv_positif: "FIV +",
  felv_positif: "FeLV +",
  fiv_felv_positif: "FIV/FeLV +",
  non_teste: "Non testé",
};

/** Cellule de compatibilité : oui (coral) / non (brique) / inconnu (neutre). */
function Compat({ value }: { value: string }) {
  if (value === "oui") return <span className="inline-flex items-center gap-1 font-semibold text-coral-700"><Icon name="check" size={15} /> Oui</span>;
  if (value === "non") return <span className="inline-flex items-center gap-1 font-semibold text-brick-600"><Icon name="x" size={15} /> Non</span>;
  return <span className="text-muted-foreground">Inconnu</span>;
}

/** Booléen santé : oui = coral, non = tiret discret. */
function Bool({ value }: { value: boolean }) {
  return value
    ? <span className="inline-flex items-center gap-1 font-semibold text-coral-700"><Icon name="check" size={15} /> Oui</span>
    : <span className="text-muted-foreground">Non</span>;
}

/** Une ligne = un attribut, une valeur par animal. */
interface Row {
  label: string;
  render: (pet: Pet) => ReactNode;
  /** N'afficher la ligne que si au moins un animal a une donnée (ex. FIV/FeLV chat). */
  when?: (pets: Pet[]) => boolean;
}

const ROWS: Row[] = [
  { label: "Espèce", render: (p) => SPECIES_LABEL[p.species] ?? p.species },
  { label: "Sexe", render: (p) => SEX_LABEL[p.sex] ?? p.sex },
  { label: "Âge", render: (p) => (p.ageCategory ? AGE_LABEL[p.ageCategory] : "Inconnu") },
  { label: "Race", render: (p) => p.breed ?? "Croisé" },
  { label: "Robe", render: (p) => p.color ?? "—" },
  {
    label: "Frais d'adoption",
    render: (p) => (p.adoptionFee != null ? <span className="tabular font-semibold text-coral-700">{p.adoptionFee} €</span> : "—"),
  },
  { label: "Stérilisé·e", render: (p) => <Bool value={p.isSterilized} /> },
  { label: "Vacciné·e", render: (p) => <Bool value={p.isVaccinated} /> },
  { label: "Identifié·e", render: (p) => <Bool value={p.isChipped} /> },
  {
    label: "FIV / FeLV",
    when: (pets) => pets.some((p) => p.species === "chat"),
    render: (p) => (p.species === "chat" && p.fivFelv ? (FIV_LABEL[p.fivFelv] ?? p.fivFelv) : "—"),
  },
  { label: "S'entend avec les chats", render: (p) => <Compat value={p.okWithCats} /> },
  { label: "S'entend avec les chiens", render: (p) => <Compat value={p.okWithDogs} /> },
  { label: "S'entend avec les enfants", render: (p) => <Compat value={p.okWithChildren} /> },
  {
    label: "Besoins spécifiques",
    when: (pets) => pets.some((p) => p.specialNeeds),
    render: (p) => (p.specialNeeds ? <span className="text-[13px]">{p.specialNeeds}</span> : "—"),
  },
  { label: "Refuge", render: (p) => p.shelter?.name ?? "—" },
];

export function ComparePage() {
  const selection = useCompare();
  const results = useQueries({
    queries: selection.map((s) => ({ queryKey: ["pet", s.id], queryFn: () => petsApi.get(s.id) })),
  });

  const pets = results.map((r) => r.data).filter((p): p is Pet => p != null);
  const isLoading = results.some((r) => r.isLoading);
  const rows = ROWS.filter((row) => !row.when || row.when(pets));

  return (
    <div className="mx-auto max-w-[1180px] px-8 pb-[60px] pt-[26px]">
      <Link to="/adopter" className="mono inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] text-coral-700">
        <Icon name="arrow" size={14} className="rotate-180" /> Retour au catalogue
      </Link>

      <div className="mt-[18px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[38px] font-semibold tracking-[-0.01em] text-foreground">Comparer</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Mettez vos coups de cœur côte à côte pour trancher.
          </p>
        </div>
        {selection.length > 0 && (
          <button type="button" onClick={clearCompare} className="text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Tout retirer
          </button>
        )}
      </div>

      {selection.length === 0 ? (
        <div className="mt-8 rounded-[8px] border border-dashed border-line px-6 py-[70px] text-center">
          <span className="inline-flex text-sable-300"><Icon name="columns" size={46} /></span>
          <p className="mt-3.5 font-semibold text-foreground">Aucun animal à comparer</p>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Depuis le catalogue, ajoutez des animaux à la comparaison avec l'icône <Icon name="columns" size={14} className="mx-0.5 inline align-[-2px]" /> sur leur photo.
          </p>
          <div className="mt-5"><Link to="/adopter"><Btn icon="paw">Parcourir le catalogue</Btn></Link></div>
        </div>
      ) : isLoading ? (
        <p className="mt-8 text-muted-foreground">Chargement…</p>
      ) : pets.length === 0 ? (
        <p className="mt-8 text-brick-600">Ces animaux ne sont plus disponibles.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-[168px] bg-background" />
                {pets.map((p) => (
                  <th key={p.id} className="p-2 align-top" style={{ width: `${72 / pets.length}%` }}>
                    <div className="overflow-hidden rounded-[8px] border border-line bg-card">
                      <div className="relative aspect-[4/3] bg-muted">
                        {p.photos[0] ? (
                          <img src={p.photos.find((ph) => ph.isPrimary)?.url ?? p.photos[0].url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-[40px] text-sable-300">{p.species === "chat" ? "🐱" : "🐶"}</span>
                        )}
                        <button
                          type="button"
                          title={`Retirer ${p.name}`}
                          onClick={() => removeCompare(p.id)}
                          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-foreground/55 text-white transition-colors hover:bg-foreground/80"
                        >
                          <Icon name="x" size={15} />
                        </button>
                      </div>
                      <div className="px-2.5 py-2 text-center">
                        <Link to={`/adopter/${p.id}`} className="text-[17px] font-semibold text-foreground hover:text-coral-700">{p.name}</Link>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 1 ? "bg-card/50" : undefined}>
                  <th className="sticky left-0 z-10 border-t border-line bg-background py-2.5 pr-3 text-left align-top">
                    <span className="mono text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{row.label}</span>
                  </th>
                  {pets.map((p) => (
                    <td key={p.id} className="border-t border-line px-3 py-2.5 text-center align-top text-[14px] text-foreground">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th className="sticky left-0 z-10 bg-background" />
                {pets.map((p) => (
                  <td key={p.id} className="px-3 pt-3.5 text-center align-top">
                    <Link to={`/adopter/${p.id}`}><Btn variant="soft" size="sm" icon="arrow" iconRight="arrow">Voir la fiche</Btn></Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
