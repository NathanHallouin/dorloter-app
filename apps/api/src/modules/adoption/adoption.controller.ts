/**
 * Endpoints du module Adoption : catalogue public (liste paginée + fiche),
 * favoris et candidatures de l'utilisateur authentifié.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, page, type ApiResponse, type PageResponse } from '../../shared/api-response';
import { AGE_CATEGORY, HOUSING_TYPE, SEX, SPECIES, validateFilter } from '../../shared/db-enum';
import { clampLimit, queryBool, queryInt, queryString } from '../../shared/validation';
import {
  toApplicationDto,
  toPetDto,
  toPetSummaryDto,
  type ApplicationDto,
  type PetDto,
  type PetSummaryDto,
} from './adoption.dto';
import { AdoptionService, PET_DEFAULT_LIMIT, PET_MAX_LIMIT } from './adoption.service';

export class AddFavoriteDto {
  @IsUUID('4', { message: 'Animal invalide.' })
  petId!: string;
}

export class CreateApplicationDto {
  @IsUUID('4', { message: 'Animal invalide.' })
  petId!: string;

  @IsString({ message: 'Motivation invalide.' })
  @Length(10, 5000, { message: 'La motivation doit faire entre 10 et 5000 caractères.' })
  motivation!: string;

  @IsOptional() @IsString({ message: 'Type de logement invalide.' }) housingType?: string;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) hasOutdoorAccess?: boolean;
  @IsOptional() @IsString() hasOtherPets?: string;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) hasChildren?: boolean;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Âges des enfants trop longs.' })
  childrenAges?: string;

  @IsOptional() @IsString() @Length(0, 5000, { message: 'Expérience trop longue.' })
  experience?: string;

  @IsOptional() @IsString() @Length(0, 2000, { message: 'Disponibilités trop longues.' })
  availability?: string;
}

@Controller('api/v1')
export class AdoptionController {
  constructor(private readonly adoption: AdoptionService) {}

  @Get('pets')
  async listPets(@Query() query: Record<string, unknown>): Promise<PageResponse<PetSummaryDto>> {
    const limit = clampLimit(queryInt(query.limit, 'limit'), PET_DEFAULT_LIMIT, PET_MAX_LIMIT);
    const result = await this.adoption.list(
      {
        species: validateFilter(queryString(query.species), SPECIES),
        sex: validateFilter(queryString(query.sex), SEX),
        ageCategory: validateFilter(queryString(query.ageCategory), AGE_CATEGORY),
        okWithCats: queryBool(query.okWithCats, 'okWithCats'),
        okWithDogs: queryBool(query.okWithDogs, 'okWithDogs'),
        okWithChildren: queryBool(query.okWithChildren, 'okWithChildren'),
        shelterId: queryString(query.shelterId),
        search: queryString(query.search),
      },
      queryString(query.cursor),
      limit,
    );
    return page(result.items.map(toPetSummaryDto), result.nextCursor);
  }

  @Get('pets/:id')
  async getPet(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<PetDto>> {
    return ok(toPetDto(await this.adoption.getById(id)));
  }

  @Post('favorites')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: AddFavoriteDto,
  ): Promise<void> {
    await this.adoption.addFavorite(current.userId, dto.petId);
  }

  @Delete('favorites/:petId')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @CurrentUser() current: CurrentUserInfo,
    @Param('petId', ParseUUIDPipe) petId: string,
  ): Promise<void> {
    await this.adoption.removeFavorite(current.userId, petId);
  }

  @Get('me/favorites')
  @Auth()
  async myFavorites(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<PetSummaryDto[]>> {
    const items = await this.adoption.listFavorites(current.userId);
    return ok(items.map(toPetSummaryDto));
  }

  @Post('applications')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async createApplication(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateApplicationDto,
  ): Promise<ApiResponse<ApplicationDto>> {
    const application = await this.adoption.createApplication(current.userId, {
      petId: dto.petId,
      motivation: dto.motivation,
      housingType: validateFilter(dto.housingType, HOUSING_TYPE),
      hasOutdoorAccess: dto.hasOutdoorAccess ?? null,
      hasOtherPets: dto.hasOtherPets ?? null,
      hasChildren: dto.hasChildren ?? null,
      childrenAges: dto.childrenAges ?? null,
      experience: dto.experience ?? null,
      availability: dto.availability ?? null,
    });
    return ok(toApplicationDto(application));
  }

  @Get('me/applications')
  @Auth()
  async myApplications(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<ApplicationDto[]>> {
    const applications = await this.adoption.listMyApplications(current.userId);
    return ok(applications.map(toApplicationDto));
  }
}
