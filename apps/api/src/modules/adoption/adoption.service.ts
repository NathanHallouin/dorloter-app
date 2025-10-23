/**
 * Logique métier du module Adoption : catalogue paginé, favoris, candidatures.
 */

import { Inject, Injectable } from '@nestjs/common';

import { DB, type Db } from '../../infra/database/database.module';
import { AppError } from '../../shared/app-error';
import { decodeCursor, encodeCursor } from '../../shared/cursor';
import { unique } from '../../shared/format';
import { ShelterDirectory, type ShelterSummary } from '../shelters/shelter-directory.service';
import {
  APPLICATION_COLUMNS,
  petColumns,
  petPhotoColumns,
  type ApplicationRecord,
  type PetPhotoRecord,
  type PetRecord,
} from './adoption.domain';

export const PET_DEFAULT_LIMIT = 20;
export const PET_MAX_LIMIT = 100;

/** Filtres du catalogue. `okWith*` à `true` signifie « compatible (oui) ». */
export interface CatalogFilters {
  species: string | null;
  sex: string | null;
  ageCategory: string | null;
  okWithCats: boolean | null;
  okWithDogs: boolean | null;
  okWithChildren: boolean | null;
  shelterId: string | null;
  search: string | null;
}

/** Un animal accompagné de sa photo principale et du résumé de son refuge. */
export interface PetListItem {
  pet: PetRecord;
  primaryPhoto: PetPhotoRecord | null;
  shelter: ShelterSummary | null;
}

export interface PetListPage {
  items: PetListItem[];
  nextCursor: string | null;
}

export interface PetDetail {
  pet: PetRecord;
  photos: PetPhotoRecord[];
  shelter: ShelterSummary | null;
}

export interface CreateApplicationCommand {
  petId: string;
  motivation: string;
  housingType: string | null;
  hasOutdoorAccess: boolean | null;
  hasOtherPets: string | null;
  hasChildren: boolean | null;
  childrenAges: string | null;
  experience: string | null;
  availability: string | null;
}

interface PetCursor {
  ts: string;
  id: string;
}

@Injectable()
export class AdoptionService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly shelters: ShelterDirectory,
  ) {}

  // --- Catalogue -------------------------------------------------------------------

  async list(
    filters: CatalogFilters,
    cursorParam: string | null,
    limit: number,
  ): Promise<PetListPage> {
    let query = this.db.selectFrom('pets').select(petColumns()).where('status', '=', 'disponible');

    if (filters.species !== null) query = query.where('species', '=', filters.species);
    if (filters.sex !== null) query = query.where('sex', '=', filters.sex);
    if (filters.ageCategory !== null) {
      query = query.where('age_category', '=', filters.ageCategory);
    }
    if (filters.okWithCats === true) query = query.where('ok_with_cats', '=', 'oui');
    if (filters.okWithDogs === true) query = query.where('ok_with_dogs', '=', 'oui');
    if (filters.okWithChildren === true) query = query.where('ok_with_children', '=', 'oui');
    if (filters.shelterId !== null) query = query.where('shelter_id', '=', filters.shelterId);
    if (filters.search !== null) {
      const term = `%${filters.search}%`;
      query = query.where((eb) =>
        eb.or([eb('name', 'ilike', term), eb('description', 'ilike', term)]),
      );
    }

    const cursor = decodeCursor<PetCursor>(cursorParam);
    if (cursor !== null) {
      const ts = new Date(cursor.ts);
      query = query.where((eb) =>
        eb.or([
          eb('created_at', '<', ts),
          eb.and([eb('created_at', '=', ts), eb('id', '<', cursor.id)]),
        ]),
      );
    }

    const rows = await query
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .execute();

    const hasMore = rows.length > limit;
    const pets = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? pets[pets.length - 1] : undefined;
    const nextCursor = last
      ? encodeCursor<PetCursor>({ ts: last.created_at.toISOString(), id: last.id })
      : null;

    return { items: await this.assemble(pets), nextCursor };
  }

  async getById(id: string): Promise<PetDetail> {
    const pet = await this.db
      .selectFrom('pets')
      .select(petColumns())
      .where('id', '=', id)
      .where('status', '<>', 'retire')
      .executeTakeFirst();
    if (!pet) throw AppError.notFoundId('Animal', id);

    const photos = await this.db
      .selectFrom('pet_photos')
      .select(petPhotoColumns())
      .where('pet_id', '=', id)
      .orderBy('is_primary', 'desc')
      .orderBy('order', 'asc')
      .execute();

    return { pet, photos, shelter: await this.shelters.findSummary(pet.shelter_id) };
  }

  /** Résumés pour une liste d'ids, dans l'ordre fourni (favoris). */
  async summariesByIds(ids: string[]): Promise<PetListItem[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .selectFrom('pets')
      .select(petColumns())
      .where('id', 'in', ids)
      .execute();
    const byId = new Map(rows.map((pet) => [pet.id, pet]));
    // Respecte l'ordre demandé (les ids favoris sont déjà triés par date).
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((pet): pet is PetRecord => pet !== undefined);
    return this.assemble(ordered);
  }

  /** Assemble les données liées (photo principale + refuge) sans N+1. */
  private async assemble(pets: PetRecord[]): Promise<PetListItem[]> {
    if (pets.length === 0) return [];
    const petIds = pets.map((pet) => pet.id);

    const photos = await this.db
      .selectFrom('pet_photos')
      .select(petPhotoColumns())
      .where('pet_id', 'in', petIds)
      .where('is_primary', '=', true)
      .execute();
    const primaryByPet = new Map<string, PetPhotoRecord>();
    for (const photo of photos) {
      if (!primaryByPet.has(photo.pet_id)) primaryByPet.set(photo.pet_id, photo);
    }

    const shelters = await this.shelters.findSummaries(unique(pets.map((p) => p.shelter_id)));

    return pets.map((pet) => ({
      pet,
      primaryPhoto: primaryByPet.get(pet.id) ?? null,
      shelter: shelters.get(pet.shelter_id) ?? null,
    }));
  }

  // --- Favoris ---------------------------------------------------------------------

  async addFavorite(userId: string, petId: string): Promise<void> {
    const exists = await this.db
      .selectFrom('pets')
      .select('id')
      .where('id', '=', petId)
      .executeTakeFirst();
    if (!exists) throw AppError.notFoundId('Animal', petId);
    // Idempotent : conflit sur la clé composite (user, pet) ignoré.
    await this.db
      .insertInto('favorites')
      .values({ user_id: userId, pet_id: petId })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  async removeFavorite(userId: string, petId: string): Promise<void> {
    await this.db
      .deleteFrom('favorites')
      .where('user_id', '=', userId)
      .where('pet_id', '=', petId)
      .execute();
  }

  async listFavorites(userId: string): Promise<PetListItem[]> {
    const rows = await this.db
      .selectFrom('favorites')
      .select('pet_id')
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
    return this.summariesByIds(rows.map((row) => row.pet_id));
  }

  // --- Candidatures ------------------------------------------------------------------

  async createApplication(
    userId: string,
    cmd: CreateApplicationCommand,
  ): Promise<ApplicationRecord> {
    const pet = await this.db
      .selectFrom('pets')
      .select('status')
      .where('id', '=', cmd.petId)
      .executeTakeFirst();
    if (!pet) throw AppError.notFoundId('Animal', cmd.petId);
    if (pet.status !== 'disponible') {
      throw AppError.unprocessable("Cet animal n'est plus disponible à l'adoption.");
    }

    // Une seule candidature « en cours » par (animal, utilisateur).
    const already = await this.db
      .selectFrom('applications')
      .select('id')
      .where('pet_id', '=', cmd.petId)
      .where('user_id', '=', userId)
      .where('status', 'in', ['envoyee', 'en_cours', 'acceptee'])
      .executeTakeFirst();
    if (already) {
      throw AppError.conflict('Vous avez déjà une candidature en cours pour cet animal.');
    }

    return this.db
      .insertInto('applications')
      .values({
        pet_id: cmd.petId,
        user_id: userId,
        status: 'envoyee',
        motivation: cmd.motivation,
        housing_type: cmd.housingType,
        has_outdoor_access: cmd.hasOutdoorAccess,
        has_other_pets: cmd.hasOtherPets,
        has_children: cmd.hasChildren,
        children_ages: cmd.childrenAges,
        experience: cmd.experience,
        availability: cmd.availability,
      })
      .returning(APPLICATION_COLUMNS)
      .executeTakeFirstOrThrow();
  }

  async listMyApplications(userId: string): Promise<ApplicationRecord[]> {
    return this.db
      .selectFrom('applications')
      .select(APPLICATION_COLUMNS)
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
  }
}
