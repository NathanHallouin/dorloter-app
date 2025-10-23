/**
 * Familles d'accueil : relation utilisateur <-> refuge (invitation du refuge ou
 * demande de l'utilisateur -> active), puis placements d'animaux.
 * Permissions refuge : `Fosters*`.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { UserDirectory } from '../identity/identity.directory';
import { ShelterDirectory } from '../shelters/shelter-directory.service';
import { ShelterMembershipService } from '../shelters/shelter-membership.service';

// --- Requêtes ---------------------------------------------------------------------

export class FosterInviteDto {
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;
}

export class PlacePetDto {
  @IsUUID('4', { message: 'Animal invalide.' })
  petId!: string;
}

export class FosterRequestDto {
  @IsUUID('4', { message: 'Refuge invalide.' }) shelterId!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsInt({ message: 'Capacité invalide.' }) @Min(0, { message: 'Capacité invalide.' })
  capacity?: number;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) acceptsCats?: boolean;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) acceptsDogs?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class FosterRespondDto {
  @IsBoolean({ message: 'Valeur invalide.' }) accept!: boolean;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsInt({ message: 'Capacité invalide.' }) @Min(0, { message: 'Capacité invalide.' })
  capacity?: number;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) acceptsCats?: boolean;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) acceptsDogs?: boolean;
  @IsOptional() @IsString() notes?: string;
}

/** Préférences d'accueil, avec les défauts du domaine. */
interface Prefs {
  city: string | null;
  capacity: number;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  notes: string | null;
}

function toPrefs(dto: FosterRequestDto | FosterRespondDto): Prefs {
  return {
    city: dto.city ?? null,
    capacity: dto.capacity ?? 1,
    acceptsCats: dto.acceptsCats ?? true,
    acceptsDogs: dto.acceptsDogs ?? true,
    notes: dto.notes ?? null,
  };
}

// --- Réponses ---------------------------------------------------------------------

interface FosterPlacementDto {
  id: string;
  petId: string;
  petName: string;
  startedAt: string;
}

/** Famille d'accueil vue par le refuge (compte utilisateur + statut + placements). */
interface FosterFamilyDto {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  capacity: number;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  notes: string | null;
  status: string;
  source: string;
  placements: FosterPlacementDto[];
}

/** Relation famille d'accueil vue par l'utilisateur (avec le refuge concerné). */
interface MyFostershipDto {
  id: string;
  shelterId: string;
  shelterName: string | null;
  shelterSlug: string | null;
  city: string | null;
  capacity: number;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  notes: string | null;
  status: string;
  source: string;
  placements: FosterPlacementDto[];
}

interface FosterFamilyRecord {
  id: string;
  shelter_id: string;
  user_id: string;
  source: string;
  status: string;
  city: string | null;
  capacity: number;
  accepts_cats: boolean;
  accepts_dogs: boolean;
  notes: string | null;
}

const FAMILY_COLUMNS = [
  'id',
  'shelter_id',
  'user_id',
  'source',
  'status',
  'city',
  'capacity',
  'accepts_cats',
  'accepts_dogs',
  'notes',
] as const;

@Controller('api/v1')
export class AdoptionFosterController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly users: UserDirectory,
    private readonly shelters: ShelterDirectory,
  ) {}

  // --- Côté refuge --------------------------------------------------------------------

  @Get('shelter/fosters')
  @Auth()
  async listForShelter(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<FosterFamilyDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'fosters:read');
    const families = await this.db
      .selectFrom('foster_families')
      .select(FAMILY_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .orderBy('created_at', 'desc')
      .execute();

    const placements = await this.activePlacements(families.map((f) => f.id));
    const refs = await this.users.findRefsById(families.map((f) => f.user_id));

    return ok(
      families.map((family) => {
        const ref = refs.get(family.user_id) ?? null;
        return {
          id: family.id,
          userId: family.user_id,
          name: ref?.name ?? null,
          email: ref?.email ?? null,
          phone: ref?.phone ?? null,
          city: family.city,
          capacity: family.capacity,
          acceptsCats: family.accepts_cats,
          acceptsDogs: family.accepts_dogs,
          notes: family.notes,
          status: family.status,
          source: family.source,
          placements: placements.get(family.id) ?? [],
        };
      }),
    );
  }

  @Post('shelter/fosters')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: FosterInviteDto,
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(current.userId, 'fosters:write');
    const targetUserId = await this.users.userIdByEmail(dto.email);
    if (targetUserId === null) {
      throw AppError.unprocessable(
        "Aucun compte Dorloter avec cet email. La personne doit d'abord créer un compte.",
      );
    }
    const existing = await this.db
      .selectFrom('foster_families')
      .select('id')
      .where('shelter_id', '=', shelterId)
      .where('user_id', '=', targetUserId)
      .executeTakeFirst();
    if (existing) {
      throw AppError.conflict(
        "Cette personne est déjà famille d'accueil (ou a une invitation/demande en cours).",
      );
    }
    await this.db
      .insertInto('foster_families')
      .values({
        shelter_id: shelterId,
        user_id: targetUserId,
        source: 'shelter',
        status: 'invited',
      })
      .execute();
  }

  @Post('shelter/fosters/:id/respond')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async respondToRequest(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FosterRespondDto,
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(current.userId, 'fosters:write');
    const family = await this.shelterFamily(shelterId, id);
    if (family.status !== 'requested') {
      throw AppError.conflict("Cette relation n'est pas une demande en attente.");
    }
    await this.db
      .updateTable('foster_families')
      .set({ status: dto.accept ? 'active' : 'declined', updated_at: new Date() })
      .where('id', '=', family.id)
      .execute();
  }

  @Post('shelter/fosters/:id/end')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async endRelation(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(current.userId, 'fosters:write');
    const family = await this.shelterFamily(shelterId, id);
    await this.db
      .updateTable('foster_placements')
      .set({ ended_at: today() })
      .where('foster_family_id', '=', family.id)
      .where('ended_at', 'is', null)
      .execute();
    await this.db
      .updateTable('foster_families')
      .set({ status: 'ended', updated_at: new Date() })
      .where('id', '=', family.id)
      .execute();
  }

  @Post('shelter/fosters/:id/placements')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async placePet(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlacePetDto,
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(current.userId, 'fosters:write');
    const family = await this.shelterFamily(shelterId, id);
    if (family.status !== 'active') {
      throw AppError.conflict('Seule une famille active peut accueillir un animal.');
    }
    const pet = await this.db
      .selectFrom('pets')
      .select('shelter_id')
      .where('id', '=', dto.petId)
      .executeTakeFirst();
    if (!pet) throw AppError.notFoundId('Animal', dto.petId);
    if (pet.shelter_id !== shelterId) {
      throw AppError.forbidden("Cet animal n'appartient pas à votre refuge.");
    }
    const already = await this.db
      .selectFrom('foster_placements')
      .select('id')
      .where('pet_id', '=', dto.petId)
      .where('ended_at', 'is', null)
      .executeTakeFirst();
    if (already) throw AppError.conflict("Cet animal est déjà placé en famille d'accueil.");

    await this.db
      .insertInto('foster_placements')
      .values({ foster_family_id: family.id, pet_id: dto.petId })
      .execute();
  }

  @Post('shelter/fosters/placements/:placementId/end')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async endPlacement(
    @CurrentUser() current: CurrentUserInfo,
    @Param('placementId', ParseUUIDPipe) placementId: string,
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(current.userId, 'fosters:write');
    const placement = await this.db
      .selectFrom('foster_placements')
      .select('foster_family_id')
      .where('id', '=', placementId)
      .executeTakeFirst();
    if (!placement) throw AppError.notFoundId('Placement', placementId);
    // Vérifie l'appartenance au refuge.
    await this.shelterFamily(shelterId, placement.foster_family_id);
    await this.db
      .updateTable('foster_placements')
      .set({ ended_at: today() })
      .where('id', '=', placementId)
      .execute();
  }

  // --- Côté utilisateur ---------------------------------------------------------------

  @Get('me/fosterships')
  @Auth()
  async listForUser(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<MyFostershipDto[]>> {
    const families = await this.db
      .selectFrom('foster_families')
      .select(FAMILY_COLUMNS)
      .where('user_id', '=', current.userId)
      .orderBy('created_at', 'desc')
      .execute();

    const shelters = await this.shelters.findSummaries(families.map((f) => f.shelter_id));
    const placements = await this.activePlacements(families.map((f) => f.id));

    return ok(
      families.map((family) => {
        const shelter = shelters.get(family.shelter_id) ?? null;
        return {
          id: family.id,
          shelterId: family.shelter_id,
          shelterName: shelter?.name ?? null,
          shelterSlug: shelter?.slug ?? null,
          city: family.city,
          capacity: family.capacity,
          acceptsCats: family.accepts_cats,
          acceptsDogs: family.accepts_dogs,
          notes: family.notes,
          status: family.status,
          source: family.source,
          placements: placements.get(family.id) ?? [],
        };
      }),
    );
  }

  @Post('me/fosterships')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async requestFostering(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: FosterRequestDto,
  ): Promise<void> {
    const shelter = await this.shelters.findSummary(dto.shelterId);
    if (!shelter) throw AppError.notFoundId('Refuge', dto.shelterId);
    if (!shelter.acceptsFosterApplications) {
      throw AppError.unprocessable(
        "Ce refuge n'accepte pas les demandes spontanées de famille d'accueil.",
      );
    }
    const existing = await this.db
      .selectFrom('foster_families')
      .select('id')
      .where('shelter_id', '=', dto.shelterId)
      .where('user_id', '=', current.userId)
      .executeTakeFirst();
    if (existing) {
      throw AppError.conflict("Vous avez déjà une relation famille d'accueil avec ce refuge.");
    }
    const prefs = toPrefs(dto);
    await this.db
      .insertInto('foster_families')
      .values({
        shelter_id: dto.shelterId,
        user_id: current.userId,
        source: 'user',
        status: 'requested',
        city: prefs.city,
        capacity: prefs.capacity,
        accepts_cats: prefs.acceptsCats,
        accepts_dogs: prefs.acceptsDogs,
        notes: prefs.notes,
      })
      .execute();
  }

  @Post('me/fosterships/:id/respond')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async respondToInvitation(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FosterRespondDto,
  ): Promise<void> {
    const family = await this.db
      .selectFrom('foster_families')
      .select(FAMILY_COLUMNS)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!family) throw AppError.notFoundId("Famille d'accueil", id);
    if (family.user_id !== current.userId) {
      throw AppError.forbidden('Cette invitation ne vous concerne pas.');
    }
    if (family.status !== 'invited') {
      throw AppError.conflict("Cette invitation n'est plus en attente.");
    }

    if (dto.accept) {
      const prefs = toPrefs(dto);
      await this.db
        .updateTable('foster_families')
        .set({
          status: 'active',
          city: prefs.city,
          capacity: prefs.capacity,
          accepts_cats: prefs.acceptsCats,
          accepts_dogs: prefs.acceptsDogs,
          notes: prefs.notes,
          updated_at: new Date(),
        })
        .where('id', '=', family.id)
        .execute();
    } else {
      await this.db
        .updateTable('foster_families')
        .set({ status: 'declined', updated_at: new Date() })
        .where('id', '=', family.id)
        .execute();
    }
  }

  // --- Helpers -------------------------------------------------------------------------

  private async activePlacements(
    familyIds: string[],
  ): Promise<Map<string, FosterPlacementDto[]>> {
    const map = new Map<string, FosterPlacementDto[]>();
    if (familyIds.length === 0) return map;
    const rows = await this.db
      .selectFrom('foster_placements as fp')
      .innerJoin('pets as p', 'p.id', 'fp.pet_id')
      .select(['fp.id', 'fp.foster_family_id', 'fp.pet_id', 'p.name as pet_name', 'fp.started_at'])
      .where('fp.foster_family_id', 'in', familyIds)
      .where('fp.ended_at', 'is', null)
      .execute();
    for (const row of rows) {
      const list = map.get(row.foster_family_id) ?? [];
      list.push({
        id: row.id,
        petId: row.pet_id,
        petName: row.pet_name,
        startedAt: row.started_at,
      });
      map.set(row.foster_family_id, list);
    }
    return map;
  }

  private async shelterFamily(
    shelterId: string,
    familyId: string,
  ): Promise<FosterFamilyRecord> {
    const family = await this.db
      .selectFrom('foster_families')
      .select(FAMILY_COLUMNS)
      .where('id', '=', familyId)
      .executeTakeFirst();
    if (!family) throw AppError.notFoundId("Famille d'accueil", familyId);
    if (family.shelter_id !== shelterId) {
      throw AppError.forbidden("Cette famille d'accueil n'appartient pas à votre refuge.");
    }
    return family;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
