/**
 * Endpoints des signalements perdus/trouvés. GET publics (liste proximité +
 * curseur, détail, correspondances) ; création (avec matching auto), révélation
 * du contact et résolution protégés.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, page, type ApiResponse, type PageResponse } from '../../shared/api-response';
import {
  bodyEnumOpt,
  bodyEnumReq,
  REPORT_STATUS,
  REPORT_TYPE,
  SEX,
  SPECIES,
  validateFilter,
} from '../../shared/db-enum';
import { toIso, toIsoOrNull } from '../../shared/format';
import { clampLimit, queryFloat, queryInt, queryString } from '../../shared/validation';
import type { ReportPhotoRecord, ReportRecord } from './lostfound.domain';
import {
  LostFoundService,
  REPORT_DEFAULT_LIMIT,
  REPORT_MAX_LIMIT,
  type MatchView,
  type ReportDetail,
  type ReportListItem,
} from './lostfound.service';

// --- Requêtes ---------------------------------------------------------------------

export class ReportPhotoDto {
  @IsString({ message: 'URL invalide.' })
  @Length(1, 2000, { message: "L'URL est requise." })
  url!: string;

  @IsOptional() @IsString() blurDataUrl?: string;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) isPrimary?: boolean;
}

export class CreateReportDto {
  @IsString({ message: 'Type invalide.' }) type!: string;
  @IsString({ message: 'Espèce invalide.' }) species!: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Nom trop long.' })
  petName?: string;

  @IsString({ message: 'Description invalide.' })
  @Length(1, 5000, { message: 'La description est requise (5000 caractères maximum).' })
  description!: string;

  @IsOptional() @IsString() @Length(0, 100, { message: 'Race trop longue.' }) breed?: string;
  @IsOptional() @IsString() @Length(0, 100, { message: 'Couleur trop longue.' }) color?: string;
  @IsOptional() @IsString({ message: 'Sexe invalide.' }) sex?: string;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) isChipped?: boolean;

  @IsOptional() @IsString() @Length(0, 50, { message: 'Numéro de puce trop long.' })
  chipNumber?: string;

  @IsOptional() @IsString() @Length(0, 5000, { message: 'Signes distinctifs trop longs.' })
  distinctiveSigns?: string;

  @IsNumber({}, { message: 'Latitude invalide.' })
  @Min(-90, { message: 'Latitude invalide.' })
  @Max(90, { message: 'Latitude invalide.' })
  latitude!: number;

  @IsNumber({}, { message: 'Longitude invalide.' })
  @Min(-180, { message: 'Longitude invalide.' })
  @Max(180, { message: 'Longitude invalide.' })
  longitude!: number;

  @IsOptional() @IsString() address?: string;

  @IsDateString({}, { message: "Date de l'événement invalide." })
  dateEvent!: string;

  @IsOptional() @IsString() @Length(0, 20, { message: 'Téléphone trop long.' })
  contactPhone?: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Email trop long.' })
  contactEmail?: string;

  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray({ message: 'Photos invalides.' })
  @ValidateNested({ each: true })
  @Type(() => ReportPhotoDto)
  photos?: ReportPhotoDto[];
}

// --- Réponses ---------------------------------------------------------------------

interface LocationDto {
  lat: number;
  lng: number;
}

/** Résumé d'un signalement pour les listes et la carte. Sans coordonnées de contact. */
interface ReportSummaryDto {
  id: string;
  type: string;
  status: string;
  species: string;
  petName: string | null;
  breed: string | null;
  color: string | null;
  sex: string;
  distinctiveSigns: string | null;
  location: LocationDto;
  address: string | null;
  dateEvent: string;
  primaryPhoto: { url: string; blurDataUrl: string | null } | null;
  createdAt: string;
}

/** Fiche détaillée d'un signalement (sans contact : voir reveal-contact). */
interface ReportDto {
  id: string;
  type: string;
  status: string;
  species: string;
  petName: string | null;
  description: string;
  breed: string | null;
  color: string | null;
  sex: string;
  isChipped: boolean;
  chipNumber: string | null;
  distinctiveSigns: string | null;
  location: LocationDto;
  address: string | null;
  dateEvent: string;
  photos: { id: string; url: string; blurDataUrl: string | null; isPrimary: boolean; order: number }[];
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Correspondance suggérée, avec le signalement en face (score + distance). */
interface ReportMatchDto {
  id: string;
  score: number;
  distanceMeters: number | null;
  status: string;
  report: ReportSummaryDto;
}

function toSummaryDto(report: ReportRecord, primaryPhoto: ReportPhotoRecord | null): ReportSummaryDto {
  return {
    id: report.id,
    type: report.type,
    status: report.status,
    species: report.species,
    petName: report.pet_name,
    breed: report.breed,
    color: report.color,
    sex: report.sex,
    distinctiveSigns: report.distinctive_signs,
    location: { lat: report.lat, lng: report.lng },
    address: report.address,
    dateEvent: report.date_event,
    primaryPhoto: primaryPhoto
      ? { url: primaryPhoto.url, blurDataUrl: primaryPhoto.blur_data_url }
      : null,
    createdAt: toIso(report.created_at),
  };
}

function toReportDto(detail: ReportDetail): ReportDto {
  const { report } = detail;
  return {
    id: report.id,
    type: report.type,
    status: report.status,
    species: report.species,
    petName: report.pet_name,
    description: report.description,
    breed: report.breed,
    color: report.color,
    sex: report.sex,
    isChipped: report.is_chipped,
    chipNumber: report.chip_number,
    distinctiveSigns: report.distinctive_signs,
    location: { lat: report.lat, lng: report.lng },
    address: report.address,
    dateEvent: report.date_event,
    photos: detail.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      blurDataUrl: photo.blur_data_url,
      isPrimary: photo.is_primary,
      order: photo.display_order,
    })),
    resolvedAt: toIsoOrNull(report.resolved_at),
    createdAt: toIso(report.created_at),
    updatedAt: toIso(report.updated_at),
  };
}

function toMatchDto(view: MatchView): ReportMatchDto {
  return {
    id: view.match.id,
    score: view.match.score,
    distanceMeters: view.match.distance_meters,
    status: view.match.status,
    report: toSummaryDto(view.other, view.primaryPhoto),
  };
}

@Controller('api/v1/reports')
export class LostFoundController {
  constructor(private readonly lostfound: LostFoundService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>): Promise<PageResponse<ReportSummaryDto>> {
    const limit = clampLimit(
      queryInt(query.limit, 'limit'),
      REPORT_DEFAULT_LIMIT,
      REPORT_MAX_LIMIT,
    );
    const result = await this.lostfound.list(
      {
        type: validateFilter(queryString(query.type), REPORT_TYPE),
        status: validateFilter(queryString(query.status), REPORT_STATUS),
        species: validateFilter(queryString(query.species), SPECIES),
        latitude: queryFloat(query.lat, 'lat'),
        longitude: queryFloat(query.lng, 'lng'),
        radiusKm: queryFloat(query.radius_km, 'radius_km'),
        sinceDays: queryInt(query.since_days, 'since_days'),
      },
      queryString(query.cursor),
      limit,
    );
    return page(
      result.items.map((item: ReportListItem) => toSummaryDto(item.report, item.primaryPhoto)),
      result.nextCursor,
    );
  }

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateReportDto,
  ): Promise<ApiResponse<ReportDto>> {
    const detail = await this.lostfound.create(current.userId, {
      type: bodyEnumReq(dto.type, REPORT_TYPE, 'type'),
      species: bodyEnumReq(dto.species, SPECIES, 'species'),
      petName: dto.petName ?? null,
      description: dto.description,
      breed: dto.breed ?? null,
      color: dto.color ?? null,
      sex: bodyEnumOpt(dto.sex, SEX, 'sex') ?? 'inconnu',
      isChipped: dto.isChipped ?? false,
      chipNumber: dto.chipNumber ?? null,
      distinctiveSigns: dto.distinctiveSigns ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address ?? null,
      dateEvent: dto.dateEvent.slice(0, 10),
      contactPhone: dto.contactPhone ?? null,
      contactEmail: dto.contactEmail ?? null,
      notes: dto.notes ?? null,
      photos: (dto.photos ?? []).map((photo) => ({
        url: photo.url,
        blurDataUrl: photo.blurDataUrl ?? null,
        isPrimary: photo.isPrimary ?? false,
      })),
    });
    return ok(toReportDto(detail));
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<ReportDto>> {
    return ok(toReportDto(await this.lostfound.getDetail(id)));
  }

  @Get(':id/matches')
  async matches(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ReportMatchDto[]>> {
    const views = await this.lostfound.getMatches(id);
    return ok(views.map(toMatchDto));
  }

  @Get(':id/reveal-contact')
  @Auth()
  async revealContact(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ phone: string | null; email: string | null }>> {
    return ok(await this.lostfound.revealContact(id));
  }

  @Post(':id/resolve')
  @Auth()
  async resolve(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ReportDto>> {
    await this.lostfound.resolve(current.userId, id);
    return ok(toReportDto(await this.lostfound.getDetail(id)));
  }
}
