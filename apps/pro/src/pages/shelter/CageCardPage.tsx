import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shelterApi, petsApi } from "@dorloter/client";
import type { ShelterPet } from "@dorloter/client";
import { Icon, QR } from "@dorloter/ui";
import { petPublicUrl } from "@/lib/public-url";

const AGE_LABEL: Record<string, string> = { chaton: "Chaton", jeune: "Jeune", adulte: "Adulte", senior: "Senior" };
const SEX_LABEL: Record<string, string> = { male: "Mâle", femelle: "Femelle", inconnu: "Sexe inconnu" };

/** Une ligne compatibilité en pictos (uniquement les "oui", pour rester lisible sur la cage). */
function compatText(pet: ShelterPet): string {
  const ok: string[] = [];
  if (pet.okWithCats === "oui") ok.push("chats");
  if (pet.okWithDogs === "oui") ok.push("chiens");
  if (pet.okWithChildren === "oui") ok.push("enfants");
  return ok.length ? `S'entend avec ${ok.join(", ")}` : "";
}

/**
 * Fiche cage imprimable (8.1.2) : petite affiche à poser sur la cage / le box,
 * avec les infos clés de l'animal et un QR code vers sa fiche publique.
 * Route hors DashShell pour une impression propre (sans sidebar).
 */
export function CageCardPage() {
  const { id = "" } = useParams();
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const profile = useQuery({ queryKey: ["shelter-profile"], queryFn: () => shelterApi.profile() });
  // Photo en best-effort via l'endpoint public (404 si l'animal n'est pas publié → fallback emoji).
  const pub = useQuery({ queryKey: ["pet", id], queryFn: () => petsApi.get(id), enabled: !!id, retry: false });

  const pet = (pets.data ?? []).find((p) => p.id === id);

  if (pets.isLoading) return <Centered>Chargement…</Centered>;
  if (!pet) return <Centered>Animal introuvable.</Centered>;

  const photo = pub.data?.photos?.find((p) => p.isPrimary)?.url ?? pub.data?.photos?.[0]?.url ?? null;
  const refugeName = profile.data?.name ?? "Notre refuge";
  const compat = compatText(pet);
  const url = petPublicUrl(pet.id);

  const health: string[] = [];
  if (pet.isSterilized) health.push("Stérilisé·e");
  if (pet.isVaccinated) health.push("Vacciné·e");
  if (pet.isChipped) health.push("Identifié·e");

  return (
    <div className="min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4 portrait; margin: 14mm; }`}</style>

      {/* Barre d'actions (masquée à l'impression) */}
      <div className="mx-auto mb-4 flex max-w-[560px] items-center justify-between px-4 print:hidden">
        <Link to={`/refuge/animaux/${pet.id}`} className="text-sm text-neutral-600 hover:underline">← Retour à la fiche</Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-coral-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Imprimer / PDF
        </button>
      </div>

      {/* Affichette (A5 environ, centrée sur A4) */}
      <article className="mx-auto flex max-w-[560px] flex-col overflow-hidden rounded-[10px] border-[3px] border-coral-600 bg-white shadow-lg print:max-w-none print:rounded-none print:border-[3px] print:shadow-none">
        <header className="flex items-center justify-between bg-coral-600 px-6 py-3 text-white">
          <span className="text-[15px] font-semibold">{refugeName}</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em]">À adopter</span>
        </header>

        <div className="grid grid-cols-[1fr_auto] gap-6 p-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[46px] font-extrabold leading-none tracking-[-0.02em] text-neutral-900">{pet.name}</h1>
              <span className={pet.sex === "femelle" ? "text-coral-500" : "text-blue-500"}>
                <Icon name={pet.sex === "femelle" ? "venus" : "mars"} size={30} />
              </span>
            </div>
            <p className="mt-2 text-[17px] text-neutral-600">
              {pet.species === "chat" ? "Chat" : "Chien"}
              {pet.breed ? ` · ${pet.breed}` : ""}
              {pet.ageCategory ? ` · ${AGE_LABEL[pet.ageCategory]}` : ""}
            </p>
            <p className="mt-0.5 text-[15px] text-neutral-500">{SEX_LABEL[pet.sex]}{pet.color ? ` · ${pet.color}` : ""}</p>

            {compat && <p className="mt-4 text-[15px] font-semibold text-neutral-800">{compat}</p>}

            {health.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {health.map((h) => (
                  <span key={h} className="inline-flex items-center gap-1 rounded-full border border-coral-300 bg-coral-50 px-2.5 py-1 text-[12px] font-semibold text-coral-700">
                    <Icon name="check" size={13} /> {h}
                  </span>
                ))}
              </div>
            )}

            {pet.adoptionFee != null && (
              <p className="mt-4 text-[15px] text-neutral-700">
                Frais d'adoption : <span className="text-[18px] font-extrabold text-coral-700">{pet.adoptionFee} €</span>
              </p>
            )}
          </div>

          {/* Vignette animal (best-effort) */}
          <div className="h-[150px] w-[150px] flex-none overflow-hidden rounded-[8px] border border-neutral-200 bg-neutral-100">
            {photo ? (
              <img src={photo} alt={pet.name} className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-[64px]">{pet.species === "chat" ? "🐱" : "🐶"}</span>
            )}
          </div>
        </div>

        {pet.description && (
          <p className="mx-6 mb-2 line-clamp-3 border-t border-neutral-200 pt-4 text-[14px] leading-relaxed text-neutral-600">
            {pet.description}
          </p>
        )}

        {/* Pied : QR vers la fiche publique */}
        <footer className="mt-auto flex items-center gap-4 border-t border-neutral-200 bg-neutral-50 px-6 py-5 print:bg-white">
          <div className="rounded-[6px] border border-neutral-200 bg-white p-1.5">
            <QR value={url} size={104} />
          </div>
          <div>
            <p className="text-[16px] font-bold text-neutral-900">Scannez pour découvrir son histoire</p>
            <p className="mt-1 text-[13px] text-neutral-500">Photos, caractère et candidature en ligne sur dorloter.fr</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center text-neutral-500">{children}</div>;
}
