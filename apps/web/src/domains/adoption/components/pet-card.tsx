import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "./favorite-button";
import { placeholderPets } from "@shared/utils/placeholder-images";
import type { Pet, PetPhoto } from "@/types";

const fallbackPhotos = Object.values(placeholderPets);

interface CatCardProps {
  pet: Pet;
  photo?:
    | (Pick<PetPhoto, "url"> & Partial<Pick<PetPhoto, "blurDataUrl">>)
    | null;
  isFavorite?: boolean;
  showFavorite?: boolean;
}

const ageCategoryLabels: Record<string, string> = {
  chaton: "Chaton",
  jeune: "Jeune",
  adulte: "Adulte",
  senior: "Senior",
};

/**
 * Alt descriptif basé sur les données structurées de la fiche.
 * Pas de description visuelle parfaite, mais mieux que juste le nom.
 * Exemple : "Nala, chien Golden retriever fauve" / "Mistigri, chat tigré".
 */
function buildPetAlt(pet: Pet): string {
  const parts: string[] = [pet.name];
  parts.push(pet.species === "chien" ? "chien" : "chat");
  if (pet.breed && pet.breed.toLowerCase() !== "inconnu") parts.push(pet.breed);
  if (pet.color && pet.color.toLowerCase() !== "inconnu") parts.push(pet.color);
  return parts.join(", ");
}

export function PetCard({
  pet,
  photo,
  isFavorite = false,
  showFavorite = true,
}: CatCardProps) {
  const src =
    photo?.url ??
    fallbackPhotos[pet.name.charCodeAt(0) % fallbackPhotos.length]!;

  const alt = buildPetAlt(pet);

  const meta = [
    pet.breed && pet.breed !== "Inconnu" ? pet.breed : null,
    pet.ageCategory ? ageCategoryLabels[pet.ageCategory] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative overflow-hidden rounded-3xl bg-sable-100 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={`/adopter/${pet.id}`}
        aria-label={`Voir la fiche de ${pet.name}`}
        className="block"
      >
        <div className="relative aspect-4/5">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            placeholder={photo?.blurDataUrl ? "blur" : "empty"}
            blurDataURL={photo?.blurDataUrl ?? undefined}
          />

          {/* Dégradé bas pour lisibilité du texte */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />

          {/* Contenu overlay bas */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="text-xl font-bold leading-tight drop-shadow-sm">
              {pet.name}
            </h3>
            {meta && (
              <p className="mt-0.5 text-sm font-medium text-white/85">
                {meta}
              </p>
            )}
          </div>

          {/* Prix en pastille flottante */}
          {pet.adoptionFee && (
            <div className="absolute bottom-4 right-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-coral-700 shadow-md backdrop-blur-sm">
              {Number(pet.adoptionFee)} €
            </div>
          )}
        </div>
      </Link>

      {/* Cœur flottant en haut à droite, hors du Link */}
      {showFavorite && (
        <div className="absolute right-3 top-3">
          <div className="rounded-full bg-white/85 p-0.5 shadow-md backdrop-blur-sm">
            <FavoriteButton petId={pet.id} initialFavorite={isFavorite} />
          </div>
        </div>
      )}
    </article>
  );
}
