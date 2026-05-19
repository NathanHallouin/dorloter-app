/**
 * Back-office refuge du module Adoption : gestion des animaux du refuge (CRUD +
 * photos) et des candidatures reçues (liste enrichie + changement de statut avec
 * notification email).
 *
 * Autorisation par permission via l'appartenance au refuge, jamais par rôle JWT.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, Length } from 'class-validator';

import { DB, type Db } from '../../infra/database/database.module';
import { EmailService } from '../../infra/email/email.service';
import { applicationDecision } from '../../infra/email/templates';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { S3Service } from '../../infra/storage/s3.service';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import {
  AGE_CATEGORY,
  APPLICATION_STATUS,
  bodyEnumOpt,
  bodyEnumReq,
  COMPATIBILITY,
  FIV_FELV,
  PET_STATUS,
  SEX,
  SPECIES,
} from '../../shared/db-enum';
import { toIso, unique } from '../../shared/format';
import { UserDirectory } from '../identity/identity.directory';
import { ShelterMembershipService } from '../shelters/shelter-membership.service';
import {
  APPLICATION_COLUMNS,
  petColumns,
  type ApplicationRecord,
  type PetRecord,
} from './adoption.domain';

// --- Requêtes ---------------------------------------------------------------------

export class ShelterPetDto {
  @IsString({ message: 'Nom invalide.' })
  @Length(1, 255, { message: 'Le nom est requis (255 caractères maximum).' })
  name!: string;

  @IsString({ message: 'Espèce invalide.' }) species!: string;
  @IsOptional() @IsString({ message: 'Sexe invalide.' }) sex?: string;
  @IsOptional() @IsString() @Length(0, 100, { message: 'Race trop longue.' }) breed?: string;
  @IsOptional() @IsString() @Length(0, 100, { message: 'Couleur trop longue.' }) color?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString({ message: "Catégorie d'âge invalide." }) ageCategory?: string;
  @IsOptional() @IsString({ message: 'Statut invalide.' }) status?: string;
  @IsOptional() @IsNumber({}, { message: "Frais d'adoption invalides." }) adoptionFee?: number;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) isSterilized?: boolean;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) isChipped?: boolean;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) isVaccinated?: boolean;
  @IsOptional() @IsString({ message: 'Compatibilité invalide.' }) okWithCats?: string;
  @IsOptional() @IsString({ message: 'Compatibilité invalide.' }) okWithDogs?: string;
  @IsOptional() @IsString({ message: 'Compatibilité invalide.' }) okWithChildren?: string;
  @IsOptional() @IsString() specialNeeds?: string;
  @IsOptional() @IsString({ message: 'Statut FIV/FeLV invalide.' }) fivFelv?: string;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) indoorOnly?: boolean;
}

export class AddPetPhotoDto {
  @IsString({ message: 'URL invalide.' })
  @Length(1, 2000, { message: "L'URL est requise." })
  url!: string;

  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' })
  isPrimary?: boolean;
}

export class UpdateApplicationStatusDto {
  @IsString({ message: 'Statut invalide.' })
  status!: string;

  @IsOptional() @IsString() @Length(0, 5000, { message: 'Notes trop longues.' })
  shelterNotes?: string;
}

/** Valeurs déjà validées, défauts appliqués. */
interface PetCommand {
  name: string;
  species: string;
  sex: string;
  breed: string | null;
  color: string | null;
  description: string | null;
  ageCategory: string | null;
  status: string;
  adoptionFee: number | null;
  isSterilized: boolean;
  isChipped: boolean;
  isVaccinated: boolean;
  okWithCats: string;
  okWithDogs: string;
  okWithChildren: string;
  specialNeeds: string | null;
  fivFelv: string | null;
  indoorOnly: boolean | null;
}

function toCommand(dto: ShelterPetDto): PetCommand {
  const compat = (value: string | undefined, field: string): string =>
    bodyEnumOpt(value, COMPATIBILITY, field) ?? 'inconnu';
  return {
    name: dto.name,
    species: bodyEnumReq(dto.species, SPECIES, 'species'),
    sex: bodyEnumOpt(dto.sex, SEX, 'sex') ?? 'inconnu',
    breed: dto.breed ?? null,
    color: dto.color ?? null,
    description: dto.description ?? null,
    ageCategory: bodyEnumOpt(dto.ageCategory, AGE_CATEGORY, 'ageCategory'),
    status: bodyEnumOpt(dto.status, PET_STATUS, 'status') ?? 'disponible',
    adoptionFee: dto.adoptionFee ?? null,
    isSterilized: dto.isSterilized ?? false,
    isChipped: dto.isChipped ?? false,
    isVaccinated: dto.isVaccinated ?? false,
    okWithCats: compat(dto.okWithCats, 'okWithCats'),
    okWithDogs: compat(dto.okWithDogs, 'okWithDogs'),
    okWithChildren: compat(dto.okWithChildren, 'okWithChildren'),
    specialNeeds: dto.specialNeeds ?? null,
    fivFelv: bodyEnumOpt(dto.fivFelv, FIV_FELV, 'fivFelv'),
    indoorOnly: dto.indoorOnly ?? null,
  };
}

// --- Réponses ---------------------------------------------------------------------

/** Vue d'un animal pour le back-office refuge (tous statuts, champs complets). */
interface ShelterPetResponse {
  id: string;
  name: string;
  species: string;
  sex: string;
  breed: string | null;
  color: string | null;
  description: string | null;
  ageCategory: string | null;
  status: string;
  adoptionFee: number | null;
  isSterilized: boolean;
  isChipped: boolean;
  isVaccinated: boolean;
  okWithCats: string;
  okWithDogs: string;
  okWithChildren: string;
  specialNeeds: string | null;
  fivFelv: string | null;
  indoorOnly: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/** Candidature vue côté refuge : inclut l'identité de l'adoptant et les notes. */
interface ShelterApplicationDto {
  id: string;
  petId: string;
  petName: string | null;
  petSpecies: string | null;
  userId: string;
  applicantName: string | null;
  applicantEmail: string | null;
  applicantPhone: string | null;
  status: string;
  housingType: string | null;
  hasOutdoorAccess: boolean | null;
  hasOtherPets: string | null;
  hasChildren: boolean | null;
  childrenAges: string | null;
  experience: string | null;
  motivation: string;
  availability: string | null;
  shelterNotes: string | null;
  createdAt: string;
}

interface PetPhotoResponse {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

@Controller('api/v1/shelter')
export class AdoptionBackofficeController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly users: UserDirectory,
    private readonly email: EmailService,
    private readonly s3: S3Service,
  ) {}

  // --- Animaux du refuge ------------------------------------------------------------

  @Get('pets')
  @Auth()
  async listPets(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<ShelterPetResponse[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:read');
    const pets = await this.db
      .selectFrom('pets')
      .select(petColumns())
      .where('shelter_id', '=', shelterId)
      .orderBy('created_at', 'desc')
      .execute();
    return ok(pets.map(toPetResponse));
  }

  @Post('pets')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async createPet(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: ShelterPetDto,
  ): Promise<ApiResponse<ShelterPetResponse>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:write');
    const cmd = toCommand(dto);
    const pet = await this.db
      .insertInto('pets')
      .values({
        shelter_id: shelterId,
        name: cmd.name,
        species: cmd.species,
        sex: cmd.sex,
        breed: cmd.breed,
        color: cmd.color,
        description: cmd.description,
        age_category: cmd.ageCategory,
        status: cmd.status,
        adoption_fee: cmd.adoptionFee,
        is_sterilized: cmd.isSterilized,
        is_chipped: cmd.isChipped,
        is_vaccinated: cmd.isVaccinated,
        ok_with_cats: cmd.okWithCats,
        ok_with_dogs: cmd.okWithDogs,
        ok_with_children: cmd.okWithChildren,
        special_needs: cmd.specialNeeds,
        fiv_felv: cmd.fivFelv,
        indoor_only: cmd.indoorOnly,
      })
      .returning(petColumns())
      .executeTakeFirstOrThrow();
    return ok(toPetResponse(pet));
  }

  @Patch('pets/:id')
  @Auth()
  async updatePet(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShelterPetDto,
  ): Promise<ApiResponse<ShelterPetResponse>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:write');
    await this.ensureOwnedPet(shelterId, id);
    const cmd = toCommand(dto);
    const pet = await this.db
      .updateTable('pets')
      .set({
        name: cmd.name,
        species: cmd.species,
        sex: cmd.sex,
        breed: cmd.breed,
        color: cmd.color,
        description: cmd.description,
        age_category: cmd.ageCategory,
        status: cmd.status,
        adoption_fee: cmd.adoptionFee,
        is_sterilized: cmd.isSterilized,
        is_chipped: cmd.isChipped,
        is_vaccinated: cmd.isVaccinated,
        ok_with_cats: cmd.okWithCats,
        ok_with_dogs: cmd.okWithDogs,
        ok_with_children: cmd.okWithChildren,
        special_needs: cmd.specialNeeds,
        fiv_felv: cmd.fivFelv,
        indoor_only: cmd.indoorOnly,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returning(petColumns())
      .executeTakeFirstOrThrow();
    return ok(toPetResponse(pet));
  }

  @Get('pets/:id/photos')
  @Auth()
  async listPhotos(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<PetPhotoResponse[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:read');
    await this.ensureOwnedPet(shelterId, id);
    const photos = await this.db
      .selectFrom('pet_photos')
      .select(['id', 'url', 'is_primary', 'order'])
      .where('pet_id', '=', id)
      .orderBy('is_primary', 'desc')
      .orderBy('order', 'asc')
      .orderBy('created_at', 'asc')
      .execute();
    return ok(
      photos.map((p) => ({ id: p.id, url: p.url, isPrimary: p.is_primary, order: p.order })),
    );
  }

  @Post('pets/:id/photos')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async addPhoto(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPetPhotoDto,
  ): Promise<ApiResponse<{ id: string }>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:write');
    await this.ensureOwnedPet(shelterId, id);
    const photo = await this.db.transaction().execute(async (trx) => {
      // Une seule photo principale par animal : la nouvelle détrône l'ancienne.
      if (dto.isPrimary) {
        await trx
          .updateTable('pet_photos')
          .set({ is_primary: false })
          .where('pet_id', '=', id)
          .execute();
      }
      return trx
        .insertInto('pet_photos')
        .values({ pet_id: id, url: dto.url, is_primary: dto.isPrimary ?? false })
        .returning('id')
        .executeTakeFirstOrThrow();
    });
    return ok({ id: photo.id });
  }

  @Delete('pets/:id/photos/:photoId')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePhoto(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:write');
    await this.ensureOwnedPet(shelterId, id);
    const photo = await this.db
      .selectFrom('pet_photos')
      .select(['id', 'url'])
      .where('id', '=', photoId)
      .where('pet_id', '=', id)
      .executeTakeFirst();
    if (!photo) throw AppError.notFoundId('Photo', photoId);

    await this.db.deleteFrom('pet_photos').where('id', '=', photoId).execute();
    // L'objet stocké part aussi : sans quoi il resterait accessible par son URL.
    const key = this.s3.keyFromPublicUrl(photo.url);
    if (key) await this.s3.deleteObject(key);
  }

  /** Désigne la photo principale de la galerie. */
  @Post('pets/:id/photos/:photoId/primary')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPrimaryPhoto(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:write');
    await this.ensureOwnedPet(shelterId, id);
    await this.db.transaction().execute(async (trx) => {
      const photo = await trx
        .selectFrom('pet_photos')
        .select('id')
        .where('id', '=', photoId)
        .where('pet_id', '=', id)
        .executeTakeFirst();
      if (!photo) throw AppError.notFoundId('Photo', photoId);
      await trx.updateTable('pet_photos').set({ is_primary: false }).where('pet_id', '=', id).execute();
      await trx.updateTable('pet_photos').set({ is_primary: true }).where('id', '=', photoId).execute();
    });
  }

  // --- Candidatures reçues ------------------------------------------------------------

  @Get('applications')
  @Auth()
  async listApplications(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<ShelterApplicationDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'applications:read');
    const applications = await this.db
      .selectFrom('applications')
      .select(APPLICATION_COLUMNS)
      .where('pet_id', 'in', (eb) =>
        eb.selectFrom('pets').select('id').where('shelter_id', '=', shelterId),
      )
      .orderBy('created_at', 'desc')
      .execute();

    // Résolution groupée des adoptants et des animaux (évite le N+1).
    const applicants = await this.users.findRefsById(
      unique(applications.map((a) => a.user_id)),
    );
    const petRows = await this.db
      .selectFrom('pets')
      .select(['id', 'name', 'species'])
      .where('shelter_id', '=', shelterId)
      .execute();
    const pets = new Map(petRows.map((pet) => [pet.id, pet]));

    return ok(
      applications.map((application) => {
        const applicant = applicants.get(application.user_id) ?? null;
        const pet = pets.get(application.pet_id) ?? null;
        return toApplicationResponse(application, applicant, pet?.name ?? null, pet?.species ?? null);
      }),
    );
  }

  @Patch('applications/:id')
  @Auth()
  async updateApplicationStatus(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<ApiResponse<ShelterApplicationDto>> {
    const status = bodyEnumReq(dto.status, APPLICATION_STATUS, 'status');
    const shelterId = await this.membership.requireAccess(current.userId, 'applications:write');

    const application = await this.db
      .selectFrom('applications')
      .select(APPLICATION_COLUMNS)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!application) throw AppError.notFoundId('Candidature', id);

    const pet = await this.db
      .selectFrom('pets')
      .select(['shelter_id', 'name', 'species'])
      .where('id', '=', application.pet_id)
      .executeTakeFirst();
    if (!pet) throw AppError.notFoundId('Animal', application.pet_id);
    if (pet.shelter_id !== shelterId) {
      throw AppError.forbidden('Cette candidature ne concerne pas votre refuge.');
    }

    const updated = await this.db
      .updateTable('applications')
      .set((eb) => ({
        status,
        shelter_notes: dto.shelterNotes ?? eb.ref('shelter_notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .returning(APPLICATION_COLUMNS)
      .executeTakeFirstOrThrow();

    const adopter = await this.users.findRef(updated.user_id);

    // Notifie l'adoptant de la décision (acceptation / refus).
    if (adopter && (status === 'acceptee' || status === 'refusee')) {
      const template = applicationDecision(pet.name, status === 'acceptee');
      await this.email.send(adopter.email, adopter.name, template.subject, template.html);
    }

    return ok(toApplicationResponse(updated, adopter, pet.name, pet.species));
  }

  private async ensureOwnedPet(shelterId: string, petId: string): Promise<void> {
    const pet = await this.db
      .selectFrom('pets')
      .select('shelter_id')
      .where('id', '=', petId)
      .executeTakeFirst();
    if (!pet) throw AppError.notFoundId('Animal', petId);
    if (pet.shelter_id !== shelterId) {
      throw AppError.forbidden("Cet animal n'appartient pas à votre refuge.");
    }
  }
}

function toPetResponse(pet: PetRecord): ShelterPetResponse {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    sex: pet.sex,
    breed: pet.breed,
    color: pet.color,
    description: pet.description,
    ageCategory: pet.age_category,
    status: pet.status,
    adoptionFee: pet.adoption_fee,
    isSterilized: pet.is_sterilized,
    isChipped: pet.is_chipped,
    isVaccinated: pet.is_vaccinated,
    okWithCats: pet.ok_with_cats,
    okWithDogs: pet.ok_with_dogs,
    okWithChildren: pet.ok_with_children,
    specialNeeds: pet.special_needs,
    fivFelv: pet.fiv_felv,
    indoorOnly: pet.indoor_only,
    createdAt: toIso(pet.created_at),
    updatedAt: toIso(pet.updated_at),
  };
}

function toApplicationResponse(
  application: ApplicationRecord,
  applicant: { name: string; email: string; phone: string | null } | null,
  petName: string | null,
  petSpecies: string | null,
): ShelterApplicationDto {
  return {
    id: application.id,
    petId: application.pet_id,
    petName,
    petSpecies,
    userId: application.user_id,
    applicantName: applicant?.name ?? null,
    applicantEmail: applicant?.email ?? null,
    applicantPhone: applicant?.phone ?? null,
    status: application.status,
    housingType: application.housing_type,
    hasOutdoorAccess: application.has_outdoor_access,
    hasOtherPets: application.has_other_pets,
    hasChildren: application.has_children,
    childrenAges: application.children_ages,
    experience: application.experience,
    motivation: application.motivation,
    availability: application.availability,
    shelterNotes: application.shelter_notes,
    createdAt: toIso(application.created_at),
  };
}
