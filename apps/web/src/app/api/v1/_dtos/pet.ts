/**
 * DTO pets — convertit l'objet domaine en payload API stable.
 *
 * Pourquoi un DTO :
 *   - sépare le contrat API du schéma DB (on peut renommer une colonne sans
 *     casser les clients mobiles)
 *   - normalise les types : `Date` → ISO 8601 string, `decimal` → number
 *   - garantit qu'aucun champ sensible n'est exposé par mégarde (allowlist
 *     explicite plutôt que blocklist)
 *
 * Le shape ici est aussi utilisé pour la génération OpenAPI — la moindre
 * modif est un changement de contrat à versionner.
 */

import type { PetSummary, PetWithDetails } from "@adoption/public";

export interface PetDto {
  id: string;
  species: "chat" | "chien";
  name: string;
  description: string | null;
  breed: string | null;
  color: string | null;
  sex: "male" | "femelle" | "inconnu";
  ageCategory: "chaton" | "jeune" | "adulte" | "senior" | null;
  estimatedBirth: string | null; // ISO date YYYY-MM-DD
  isSterilized: boolean;
  isChipped: boolean;
  isVaccinated: boolean;
  fivFelv:
    | "negatif"
    | "fiv_positif"
    | "felv_positif"
    | "fiv_felv_positif"
    | "non_teste"
    | null;
  indoorOnly: boolean | null;
  okWithCats: "oui" | "non" | "inconnu";
  okWithDogs: "oui" | "non" | "inconnu";
  okWithChildren: "oui" | "non" | "inconnu";
  specialNeeds: string | null;
  status: "pre_adoptable" | "disponible" | "reserve" | "adopte" | "retire";
  adoptionFee: number | null;
  photos: PetPhotoDto[];
  shelter: PetShelterDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface PetPhotoDto {
  id: string;
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
  order: number;
}

export interface PetShelterDto {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  isVerified: boolean;
}

/**
 * PetSummaryDto — version allégée pour les listes (catalogue, similaires).
 * Pas de description, pas de photos secondaires, pas de timestamps.
 * Optimisé pour scroller des grosses pages.
 */
export interface PetSummaryDto {
  id: string;
  species: "chat" | "chien";
  name: string;
  breed: string | null;
  color: string | null;
  sex: "male" | "femelle" | "inconnu";
  ageCategory: "chaton" | "jeune" | "adulte" | "senior" | null;
  status: "pre_adoptable" | "disponible" | "reserve" | "adopte" | "retire";
  adoptionFee: number | null;
  primaryPhoto: { url: string; blurDataUrl: string | null } | null;
  shelter: { id: string; slug: string; name: string } | null;
}

export function toPetSummaryDto(pet: PetSummary): PetSummaryDto {
  return {
    id: pet.id,
    species: pet.species,
    name: pet.name,
    breed: pet.breed,
    color: pet.color,
    sex: pet.sex,
    ageCategory: pet.ageCategory,
    status: pet.status,
    adoptionFee: pet.adoptionFee !== null ? Number(pet.adoptionFee) : null,
    primaryPhoto: pet.primaryPhoto,
    shelter: pet.shelter,
  };
}

export function toPetDto(pet: PetWithDetails): PetDto {
  return {
    id: pet.id,
    species: pet.species,
    name: pet.name,
    description: pet.description,
    breed: pet.breed,
    color: pet.color,
    sex: pet.sex,
    ageCategory: pet.ageCategory,
    estimatedBirth: pet.estimatedBirth ?? null,
    isSterilized: pet.isSterilized,
    isChipped: pet.isChipped,
    isVaccinated: pet.isVaccinated,
    fivFelv: pet.fivFelv,
    indoorOnly: pet.indoorOnly,
    okWithCats: pet.okWithCats,
    okWithDogs: pet.okWithDogs,
    okWithChildren: pet.okWithChildren,
    specialNeeds: pet.specialNeeds,
    status: pet.status,
    adoptionFee: pet.adoptionFee !== null ? Number(pet.adoptionFee) : null,
    photos: pet.photos.map((p) => ({
      id: p.id,
      url: p.url,
      blurDataUrl: p.blurDataUrl,
      isPrimary: p.isPrimary,
      order: p.order,
    })),
    shelter: pet.shelter
      ? {
          id: pet.shelter.id,
          slug: pet.shelter.slug,
          name: pet.shelter.name,
          address: pet.shelter.address,
          isVerified: pet.shelter.isVerified,
        }
      : null,
    createdAt: pet.createdAt.toISOString(),
    updatedAt: pet.updatedAt.toISOString(),
  };
}
