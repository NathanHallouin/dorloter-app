/**
 * Back-office refuge : contrats d'adoption et conventions de famille d'accueil
 * (table unifiée `contracts`). Permissions : adoption -> `Applications*`,
 * foster -> `Fosters*`. À la signature d'une adoption, l'animal passe `adopte`
 * et les relances de suivi post-adoption sont créées.
 */

import { randomUUID } from 'node:crypto';

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsDateString, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { EmailService } from '../../infra/email/email.service';
import { contractReady } from '../../infra/email/templates';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { bodyEnumReq, CONTRACT_STATUS } from '../../shared/db-enum';
import { toIso, toIsoOrNull } from '../../shared/format';
import { UserDirectory } from '../identity/identity.directory';
import { ShelterDirectory } from '../shelters/shelter-directory.service';
import { ShelterMembershipService } from '../shelters/shelter-membership.service';
import { AdoptionFollowupsService } from './adoption-followups.service';

// --- Requêtes ---------------------------------------------------------------------

export class CreateAdoptionContractDto {
  @IsOptional() @IsUUID('4', { message: 'Candidature invalide.' }) applicationId?: string;
  @IsOptional() @IsUUID('4', { message: 'Animal invalide.' }) petId?: string;
  @IsOptional() @IsUUID('4', { message: 'Utilisateur invalide.' }) userId?: string;
  @IsOptional() @IsNumber({}, { message: "Frais d'adoption invalides." }) adoptionFee?: number;
  @IsOptional() @IsDateString({}, { message: "Date d'effet invalide." }) effectiveDate?: string;
  @IsOptional() @IsObject({ message: 'Clauses invalides.' }) terms?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

export class CreateFosterContractDto {
  @IsUUID('4', { message: "Famille d'accueil invalide." }) fosterFamilyId!: string;
  @IsOptional() @IsUUID('4', { message: 'Animal invalide.' }) petId?: string;
  @IsOptional() @IsDateString({}, { message: "Date d'effet invalide." }) effectiveDate?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de fin invalide.' }) endDate?: string;
  @IsOptional() @IsObject({ message: 'Clauses invalides.' }) terms?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateContractDto {
  @IsOptional() @IsNumber({}, { message: "Frais d'adoption invalides." }) adoptionFee?: number;
  @IsOptional() @IsDateString({}, { message: "Date d'effet invalide." }) effectiveDate?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de fin invalide.' }) endDate?: string;
  @IsOptional() @IsObject({ message: 'Clauses invalides.' }) terms?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

export class SetContractStatusDto {
  @IsString({ message: 'Statut invalide.' })
  status!: string;
}

// --- Domaine / réponse --------------------------------------------------------------

interface ContractRecord {
  id: string;
  type: string;
  status: string;
  shelter_id: string;
  user_id: string;
  pet_id: string | null;
  application_id: string | null;
  foster_family_id: string | null;
  reference: string;
  effective_date: string | null;
  end_date: string | null;
  adoption_fee: number | null;
  terms: unknown;
  notes: string | null;
  signed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ContractDto {
  id: string;
  type: string;
  status: string;
  reference: string;
  petId: string | null;
  petName: string | null;
  userId: string;
  adopterName: string | null;
  adopterEmail: string | null;
  applicationId: string | null;
  fosterFamilyId: string | null;
  shelterName: string | null;
  effectiveDate: string | null;
  endDate: string | null;
  adoptionFee: number | null;
  terms: unknown;
  notes: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function contractColumns() {
  return [
    'id',
    'type',
    'status',
    'shelter_id',
    'user_id',
    'pet_id',
    'application_id',
    'foster_family_id',
    'reference',
    'effective_date',
    'end_date',
    sql<number | null>`adoption_fee::float8`.as('adoption_fee'),
    'terms',
    'notes',
    'signed_at',
    'created_at',
    'updated_at',
  ] as const;
}

@Controller('api/v1/shelter/contracts')
export class AdoptionContractsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly users: UserDirectory,
    private readonly shelters: ShelterDirectory,
    private readonly followups: AdoptionFollowupsService,
    private readonly email: EmailService,
  ) {}

  @Get()
  @Auth()
  async list(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<ContractDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'applications:read');
    const contracts = await this.db
      .selectFrom('contracts')
      .select(contractColumns())
      .where('shelter_id', '=', shelterId)
      .orderBy('created_at', 'desc')
      .execute();
    return ok(await Promise.all(contracts.map((c) => this.toDto(c))));
  }

  @Get(':id')
  @Auth()
  async getOne(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ContractDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'applications:read');
    const contract = await this.load(id);
    if (contract.shelter_id !== shelterId) {
      throw AppError.forbidden('Ce contrat ne concerne pas votre refuge.');
    }
    return ok(await this.toDto(contract));
  }

  @Post('adoption')
  @Auth()
  async createAdoption(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateAdoptionContractDto,
  ): Promise<ApiResponse<ContractDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'applications:write');

    let petId: string;
    let userId: string;
    let defaultFee: number | null;

    if (dto.applicationId !== undefined) {
      const application = await this.db
        .selectFrom('applications')
        .select(['pet_id', 'user_id'])
        .where('id', '=', dto.applicationId)
        .executeTakeFirst();
      if (!application) throw AppError.notFoundId('Candidature', dto.applicationId);
      petId = application.pet_id;
      userId = application.user_id;
      defaultFee = await this.ensureShelterPet(petId, shelterId);
    } else if (dto.petId !== undefined && dto.userId !== undefined) {
      petId = dto.petId;
      userId = dto.userId;
      defaultFee = await this.ensureShelterPet(petId, shelterId);
    } else {
      throw AppError.unprocessable('applicationId, ou (petId et userId), sont requis.');
    }

    const contract = await this.db
      .insertInto('contracts')
      .values({
        type: 'adoption',
        status: 'brouillon',
        shelter_id: shelterId,
        user_id: userId,
        pet_id: petId,
        application_id: dto.applicationId ?? null,
        reference: reference('ADO'),
        effective_date: dto.effectiveDate ?? null,
        adoption_fee: dto.adoptionFee ?? defaultFee,
        terms: dto.terms ?? {},
        notes: dto.notes ?? null,
      })
      .returning(contractColumns())
      .executeTakeFirstOrThrow();
    return ok(await this.toDto(contract));
  }

  @Post('foster')
  @Auth()
  async createFoster(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateFosterContractDto,
  ): Promise<ApiResponse<ContractDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'fosters:write');

    const family = await this.db
      .selectFrom('foster_families')
      .select(['shelter_id', 'user_id'])
      .where('id', '=', dto.fosterFamilyId)
      .executeTakeFirst();
    if (!family) throw AppError.notFoundId("Famille d'accueil", dto.fosterFamilyId);
    if (family.shelter_id !== shelterId) {
      throw AppError.forbidden("Cette famille d'accueil ne concerne pas votre refuge.");
    }
    if (dto.petId !== undefined) await this.ensureShelterPet(dto.petId, shelterId);

    const contract = await this.db
      .insertInto('contracts')
      .values({
        type: 'foster',
        status: 'brouillon',
        shelter_id: shelterId,
        user_id: family.user_id,
        pet_id: dto.petId ?? null,
        foster_family_id: dto.fosterFamilyId,
        reference: reference('FA'),
        effective_date: dto.effectiveDate ?? null,
        end_date: dto.endDate ?? null,
        terms: dto.terms ?? {},
        notes: dto.notes ?? null,
      })
      .returning(contractColumns())
      .executeTakeFirstOrThrow();
    return ok(await this.toDto(contract));
  }

  @Patch(':id')
  @Auth()
  async update(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
  ): Promise<ApiResponse<ContractDto>> {
    const contract = await this.loadWritable(current.userId, id);
    if (contract.status !== 'brouillon') {
      throw AppError.conflict('Seul un contrat en brouillon est modifiable.');
    }
    const updated = await this.db
      .updateTable('contracts')
      .set((eb) => ({
        adoption_fee: dto.adoptionFee ?? eb.ref('adoption_fee'),
        effective_date: dto.effectiveDate ?? eb.ref('effective_date'),
        end_date: dto.endDate ?? eb.ref('end_date'),
        terms: dto.terms ?? eb.ref('terms'),
        notes: dto.notes ?? eb.ref('notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', contract.id)
      .returning(contractColumns())
      .executeTakeFirstOrThrow();
    return ok(await this.toDto(updated));
  }

  @Post(':id/status')
  @Auth()
  async setStatus(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetContractStatusDto,
  ): Promise<ApiResponse<ContractDto>> {
    const status = bodyEnumReq(dto.status, CONTRACT_STATUS, 'status');
    const contract = await this.loadWritable(current.userId, id);

    const setSigned = (status === 'signe' || status === 'active') && contract.signed_at === null;
    const updated = await this.db
      .updateTable('contracts')
      .set((eb) => ({
        status,
        signed_at: setSigned ? new Date() : eb.ref('signed_at'),
        updated_at: new Date(),
      }))
      .where('id', '=', contract.id)
      .returning(contractColumns())
      .executeTakeFirstOrThrow();

    // À la signature d'une adoption : l'animal passe « adopte » et les relances
    // de suivi post-adoption (J+7, J+30, J+90) sont créées.
    if (updated.type === 'adoption' && status === 'signe') {
      if (updated.pet_id !== null) {
        await this.db
          .updateTable('pets')
          .set({ status: 'adopte', updated_at: new Date() })
          .where('id', '=', updated.pet_id)
          .execute();
      }
      await this.followups.createForContract(
        updated.id,
        updated.shelter_id,
        updated.pet_id,
        updated.user_id,
        updated.signed_at ?? new Date(),
      );
    }

    // Notifie l'adoptant quand le contrat d'adoption lui est envoyé.
    if (updated.type === 'adoption' && status === 'envoye') {
      const adopter = await this.users.findRef(updated.user_id);
      if (adopter) {
        const petName = await this.petName(updated.pet_id);
        const template = contractReady(petName ?? 'votre futur compagnon', updated.reference);
        await this.email.send(adopter.email, adopter.name, template.subject, template.html);
      }
    }

    return ok(await this.toDto(updated));
  }

  // --- Internes ----------------------------------------------------------------------

  private async load(id: string): Promise<ContractRecord> {
    const contract = await this.db
      .selectFrom('contracts')
      .select(contractColumns())
      .where('id', '=', id)
      .executeTakeFirst();
    if (!contract) throw AppError.notFoundId('Contrat', id);
    return contract;
  }

  private async loadWritable(userId: string, id: string): Promise<ContractRecord> {
    const contract = await this.load(id);
    const permission = contract.type === 'foster' ? 'fosters:write' : 'applications:write';
    const shelterId = await this.membership.requireAccess(userId, permission);
    if (contract.shelter_id !== shelterId) {
      throw AppError.forbidden('Ce contrat ne concerne pas votre refuge.');
    }
    return contract;
  }

  /** Vérifie qu'un animal appartient au refuge et renvoie ses frais d'adoption. */
  private async ensureShelterPet(petId: string, shelterId: string): Promise<number | null> {
    const pet = await this.db
      .selectFrom('pets')
      .select(['shelter_id', sql<number | null>`adoption_fee::float8`.as('adoption_fee')])
      .where('id', '=', petId)
      .executeTakeFirst();
    if (!pet) throw AppError.notFoundId('Animal', petId);
    if (pet.shelter_id !== shelterId) {
      throw AppError.forbidden('Cet animal ne concerne pas votre refuge.');
    }
    return pet.adoption_fee;
  }

  private async petName(petId: string | null): Promise<string | null> {
    if (petId === null) return null;
    const pet = await this.db
      .selectFrom('pets')
      .select('name')
      .where('id', '=', petId)
      .executeTakeFirst();
    return pet?.name ?? null;
  }

  private async toDto(contract: ContractRecord): Promise<ContractDto> {
    const [petName, adopter, shelter] = await Promise.all([
      this.petName(contract.pet_id),
      this.users.findRef(contract.user_id),
      this.shelters.findSummary(contract.shelter_id),
    ]);
    return {
      id: contract.id,
      type: contract.type,
      status: contract.status,
      reference: contract.reference,
      petId: contract.pet_id,
      petName,
      userId: contract.user_id,
      adopterName: adopter?.name ?? null,
      adopterEmail: adopter?.email ?? null,
      applicationId: contract.application_id,
      fosterFamilyId: contract.foster_family_id,
      shelterName: shelter?.name ?? null,
      effectiveDate: contract.effective_date,
      endDate: contract.end_date,
      adoptionFee: contract.adoption_fee,
      terms: contract.terms,
      notes: contract.notes,
      signedAt: toIsoOrNull(contract.signed_at),
      createdAt: toIso(contract.created_at),
      updatedAt: toIso(contract.updated_at),
    };
  }
}

/** Référence lisible : `ADO-20260802-A1B2C3`. */
function reference(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}
