/** DTOs de sortie partagés par le catalogue public et le back-office refuge. */

import { toIso } from '../../shared/format';
import type { ShelterSummary } from '../shelters/shelter-directory.service';
import type { ApplicationRecord, PetPhotoRecord } from './adoption.domain';
import type { PetDetail, PetListItem } from './adoption.service';

interface PrimaryPhotoDto {
  url: string;
  blurDataUrl: string | null;
}

interface ShelterRefDto {
  id: string;
  slug: string;
  name: string;
}

/** Version allégée d'un animal pour les listes (catalogue, favoris). */
export interface PetSummaryDto {
  id: string;
  species: string;
  name: string;
  breed: string | null;
  color: string | null;
  sex: string;
  ageCategory: string | null;
  status: string;
  adoptionFee: number | null;
  okWithCats: string;
  okWithDogs: string;
  okWithChildren: string;
  primaryPhoto: PrimaryPhotoDto | null;
  shelter: ShelterRefDto | null;
}

export interface PetPhotoDto {
  id: string;
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
  order: number;
}

/** Fiche détaillée d'un animal, avec galerie et refuge. */
export interface PetDto {
  id: string;
  species: string;
  name: string;
  description: string | null;
  breed: string | null;
  color: string | null;
  sex: string;
  ageCategory: string | null;
  estimatedBirth: string | null;
  isSterilized: boolean;
  isChipped: boolean;
  isVaccinated: boolean;
  fivFelv: string | null;
  indoorOnly: boolean | null;
  okWithCats: string;
  okWithDogs: string;
  okWithChildren: string;
  specialNeeds: string | null;
  status: string;
  adoptionFee: number | null;
  photos: PetPhotoDto[];
  shelter:
    | { id: string; slug: string; name: string; address: string | null; isVerified: boolean }
    | null;
  createdAt: string;
  updatedAt: string;
}

/** Candidature vue par l'adoptant (les notes internes du refuge sont exclues). */
export interface ApplicationDto {
  id: string;
  petId: string;
  status: string;
  housingType: string | null;
  hasOutdoorAccess: boolean | null;
  hasOtherPets: string | null;
  hasChildren: boolean | null;
  childrenAges: string | null;
  experience: string | null;
  motivation: string;
  availability: string | null;
  createdAt: string;
  updatedAt: string;
}

function toShelterRef(shelter: ShelterSummary): ShelterRefDto {
  return { id: shelter.id, slug: shelter.slug, name: shelter.name };
}

function toPhotoDto(photo: PetPhotoRecord): PetPhotoDto {
  return {
    id: photo.id,
    url: photo.url,
    blurDataUrl: photo.blur_data_url,
    isPrimary: photo.is_primary,
    order: photo.display_order,
  };
}

export function toPetSummaryDto(item: PetListItem): PetSummaryDto {
  const { pet } = item;
  return {
    id: pet.id,
    species: pet.species,
    name: pet.name,
    breed: pet.breed,
    color: pet.color,
    sex: pet.sex,
    ageCategory: pet.age_category,
    status: pet.status,
    adoptionFee: pet.adoption_fee,
    okWithCats: pet.ok_with_cats,
    okWithDogs: pet.ok_with_dogs,
    okWithChildren: pet.ok_with_children,
    primaryPhoto: item.primaryPhoto
      ? { url: item.primaryPhoto.url, blurDataUrl: item.primaryPhoto.blur_data_url }
      : null,
    shelter: item.shelter ? toShelterRef(item.shelter) : null,
  };
}

export function toPetDto(detail: PetDetail): PetDto {
  const { pet } = detail;
  return {
    id: pet.id,
    species: pet.species,
    name: pet.name,
    description: pet.description,
    breed: pet.breed,
    color: pet.color,
    sex: pet.sex,
    ageCategory: pet.age_category,
    estimatedBirth: pet.estimated_birth,
    isSterilized: pet.is_sterilized,
    isChipped: pet.is_chipped,
    isVaccinated: pet.is_vaccinated,
    fivFelv: pet.fiv_felv,
    indoorOnly: pet.indoor_only,
    okWithCats: pet.ok_with_cats,
    okWithDogs: pet.ok_with_dogs,
    okWithChildren: pet.ok_with_children,
    specialNeeds: pet.special_needs,
    status: pet.status,
    adoptionFee: pet.adoption_fee,
    photos: detail.photos.map(toPhotoDto),
    shelter: detail.shelter
      ? {
          id: detail.shelter.id,
          slug: detail.shelter.slug,
          name: detail.shelter.name,
          address: detail.shelter.address,
          isVerified: detail.shelter.isVerified,
        }
      : null,
    createdAt: toIso(pet.created_at),
    updatedAt: toIso(pet.updated_at),
  };
}

export function toApplicationDto(application: ApplicationRecord): ApplicationDto {
  return {
    id: application.id,
    petId: application.pet_id,
    status: application.status,
    housingType: application.housing_type,
    hasOutdoorAccess: application.has_outdoor_access,
    hasOtherPets: application.has_other_pets,
    hasChildren: application.has_children,
    childrenAges: application.children_ages,
    experience: application.experience,
    motivation: application.motivation,
    availability: application.availability,
    createdAt: toIso(application.created_at),
    updatedAt: toIso(application.updated_at),
  };
}
