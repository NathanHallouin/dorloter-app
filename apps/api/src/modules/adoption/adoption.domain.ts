/**
 * Entités du module Adoption (tables `pets`, `pet_photos`, `applications`). Les
 * colonnes enum sont lues comme des chaînes (valeur DB française) et les
 * décimaux `numeric` sont castés en `float8` dans les requêtes.
 */

import { sql } from 'kysely';

/** Animal à adopter. `fiv_felv` et `indoor_only` sont nullables (chat uniquement). */
export interface PetRecord {
  id: string;
  shelter_id: string;
  species: string;
  name: string;
  description: string | null;
  breed: string | null;
  color: string | null;
  sex: string;
  age_category: string | null;
  estimated_birth: string | null;
  is_sterilized: boolean;
  is_chipped: boolean;
  is_vaccinated: boolean;
  fiv_felv: string | null;
  indoor_only: boolean | null;
  ok_with_cats: string;
  ok_with_dogs: string;
  ok_with_children: string;
  special_needs: string | null;
  status: string;
  adoption_fee: number | null;
  created_at: Date;
  updated_at: Date;
}

/** Colonnes de `pets` (décimal casté en float8 pour un JSON number). */
export function petColumns() {
  return [
    'id',
    'shelter_id',
    'species',
    'name',
    'description',
    'breed',
    'color',
    'sex',
    'age_category',
    'estimated_birth',
    'is_sterilized',
    'is_chipped',
    'is_vaccinated',
    'fiv_felv',
    'indoor_only',
    'ok_with_cats',
    'ok_with_dogs',
    'ok_with_children',
    'special_needs',
    'status',
    sql<number | null>`adoption_fee::float8`.as('adoption_fee'),
    'created_at',
    'updated_at',
  ] as const;
}

/** Photo d'un animal (galerie). `blur_data_url` = LQIP pour l'affichage progressif. */
export interface PetPhotoRecord {
  id: string;
  pet_id: string;
  url: string;
  blur_data_url: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: Date;
}

/** Colonnes de `pet_photos` (la colonne SQL `order` est aliasée `display_order`). */
export function petPhotoColumns() {
  return [
    'id',
    'pet_id',
    'url',
    'blur_data_url',
    'is_primary',
    sql<number>`"order"`.as('display_order'),
    'created_at',
  ] as const;
}

/** Candidature d'adoption d'un utilisateur pour un animal. */
export interface ApplicationRecord {
  id: string;
  pet_id: string;
  user_id: string;
  status: string;
  housing_type: string | null;
  has_outdoor_access: boolean | null;
  has_other_pets: string | null;
  has_children: boolean | null;
  children_ages: string | null;
  experience: string | null;
  motivation: string;
  availability: string | null;
  shelter_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export const APPLICATION_COLUMNS = [
  'id',
  'pet_id',
  'user_id',
  'status',
  'housing_type',
  'has_outdoor_access',
  'has_other_pets',
  'has_children',
  'children_ages',
  'experience',
  'motivation',
  'availability',
  'shelter_notes',
  'created_at',
  'updated_at',
] as const;
