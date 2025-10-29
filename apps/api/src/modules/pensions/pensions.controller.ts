/**
 * Endpoints du module Pensions : annuaire public + fiche, avis, réservations
 * (côté utilisateur) et back-office pension (réservations reçues).
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsDateString, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, page, type ApiResponse, type PageResponse } from '../../shared/api-response';
import { BOOKING_STATUS, bodyEnumReq, SPECIES } from '../../shared/db-enum';
import { toIso } from '../../shared/format';
import { clampLimit, queryBool, queryInt, queryString } from '../../shared/validation';
import {
  PENSION_DEFAULT_LIMIT,
  PENSION_MAX_LIMIT,
  PensionsService,
  type BookingView,
  type PensionDetail,
  type PensionListItem,
  type PensionRecord,
  type PensionReviewRecord,
  type Rating,
} from './pensions.service';

// --- Requêtes ---------------------------------------------------------------------

export class CreateReviewDto {
  @IsInt({ message: 'Note invalide.' })
  @Min(1, { message: 'La note doit être comprise entre 1 et 5.' })
  @Max(5, { message: 'La note doit être comprise entre 1 et 5.' })
  rating!: number;

  @IsOptional() @IsString() @Length(0, 2000, { message: 'Commentaire trop long.' })
  comment?: string;
}

export class CreateBookingDto {
  @IsString({ message: 'Espèce invalide.' }) species!: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Nom trop long.' })
  petName?: string;

  @IsDateString({}, { message: "Date d'arrivée invalide." }) startDate!: string;
  @IsDateString({}, { message: 'Date de départ invalide.' }) endDate!: string;

  @IsOptional() @IsString() @Length(0, 2000, { message: 'Notes trop longues.' })
  notes?: string;
}

export class UpdateBookingStatusDto {
  @IsString({ message: 'Statut invalide.' })
  status!: string;
}

// --- Réponses ---------------------------------------------------------------------

interface RatingDto {
  average: number;
  count: number;
}

interface LocationDto {
  latitude: number;
  longitude: number;
}

/** Résumé d'une pension pour l'annuaire. */
interface PensionSummaryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  pricePerDayCat: number | null;
  pricePerDayDog: number | null;
  rating: RatingDto | null;
}

/** Fiche détaillée d'une pension. Le SIRET est public (registre INSEE). */
interface PensionDto extends PensionSummaryDto {
  siret: string;
  agrementNumber: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: LocationDto | null;
  capacityCats: number | null;
  capacityDogs: number | null;
  services: unknown;
  openingHours: string | null;
  photos: { id: string; url: string; blurDataUrl: string | null; isPrimary: boolean; order: number }[];
  createdAt: string;
  updatedAt: string;
}

/** Vue d'une demande de réservation. */
interface BookingDto {
  id: string;
  pensionId: string;
  pensionName: string | null;
  pensionSlug: string | null;
  petName: string | null;
  species: string;
  startDate: string;
  endDate: string;
  nights: number;
  totalPrice: number | null;
  status: string;
  createdAt: string;
}

/** Avis tel que renvoyé après création. */
interface ReviewDto {
  id: string;
  pensionId: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  createdAt: string;
}

function toRatingDto(rating: Rating | null): RatingDto | null {
  return rating === null ? null : { average: rating.average, count: rating.count };
}

function toSummaryDto(pension: PensionRecord, rating: Rating | null): PensionSummaryDto {
  return {
    id: pension.id,
    slug: pension.slug,
    name: pension.name,
    description: pension.description,
    address: pension.address,
    logoUrl: pension.logo_url,
    coverUrl: pension.cover_url,
    acceptsCats: pension.accepts_cats,
    acceptsDogs: pension.accepts_dogs,
    pricePerDayCat: pension.price_per_day_cat,
    pricePerDayDog: pension.price_per_day_dog,
    rating: toRatingDto(rating),
  };
}

function toPensionDto(detail: PensionDetail): PensionDto {
  const { pension } = detail;
  return {
    ...toSummaryDto(pension, detail.rating),
    siret: pension.siret,
    agrementNumber: pension.agrement_number,
    phone: pension.phone,
    email: pension.email,
    website: pension.website,
    location:
      pension.lat !== null && pension.lng !== null
        ? { latitude: pension.lat, longitude: pension.lng }
        : null,
    capacityCats: pension.capacity_cats,
    capacityDogs: pension.capacity_dogs,
    services: pension.services,
    openingHours: pension.opening_hours,
    photos: detail.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      blurDataUrl: photo.blur_data_url,
      isPrimary: photo.is_primary,
      order: photo.display_order,
    })),
    createdAt: toIso(pension.created_at),
    updatedAt: toIso(pension.updated_at),
  };
}

function toBookingDto(view: BookingView): BookingDto {
  const { booking } = view;
  return {
    id: booking.id,
    pensionId: booking.pension_id,
    pensionName: view.pension?.name ?? null,
    pensionSlug: view.pension?.slug ?? null,
    petName: booking.pet_name,
    species: booking.species,
    startDate: booking.start_date,
    endDate: booking.end_date,
    nights: booking.nights,
    totalPrice: booking.total_price,
    status: booking.status,
    createdAt: toIso(booking.created_at),
  };
}

function toReviewDto(review: PensionReviewRecord): ReviewDto {
  return {
    id: review.id,
    pensionId: review.pension_id,
    rating: review.rating,
    comment: review.comment,
    isVerified: review.is_verified,
    createdAt: toIso(review.created_at),
  };
}

@Controller('api/v1')
export class PensionsController {
  constructor(private readonly pensions: PensionsService) {}

  @Get('pensions')
  async list(
    @Query() query: Record<string, unknown>,
  ): Promise<PageResponse<PensionSummaryDto>> {
    const limit = clampLimit(
      queryInt(query.limit, 'limit'),
      PENSION_DEFAULT_LIMIT,
      PENSION_MAX_LIMIT,
    );
    const result = await this.pensions.list(
      {
        acceptsCats: queryBool(query.acceptsCats, 'acceptsCats'),
        acceptsDogs: queryBool(query.acceptsDogs, 'acceptsDogs'),
        search: queryString(query.search),
      },
      queryString(query.cursor),
      limit,
    );
    return page(
      result.items.map((item: PensionListItem) => toSummaryDto(item.pension, item.rating)),
      result.nextCursor,
    );
  }

  @Get('pensions/:slug')
  async get(@Param('slug') slug: string): Promise<ApiResponse<PensionDto>> {
    return ok(toPensionDto(await this.pensions.getBySlug(slug)));
  }

  @Post('pensions/:id/reviews')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async addReview(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ApiResponse<ReviewDto>> {
    const review = await this.pensions.addReview(
      current.userId,
      id,
      dto.rating,
      dto.comment ?? null,
    );
    return ok(toReviewDto(review));
  }

  @Post('pensions/:id/bookings')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBookingDto,
  ): Promise<ApiResponse<BookingDto>> {
    const species = bodyEnumReq(dto.species, SPECIES, 'species');
    const view = await this.pensions.createBooking(
      current.userId,
      id,
      species,
      dto.petName ?? null,
      dto.startDate.slice(0, 10),
      dto.endDate.slice(0, 10),
      dto.notes ?? null,
    );
    return ok(toBookingDto(view));
  }

  @Get('me/bookings')
  @Auth()
  async myBookings(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<BookingDto[]>> {
    const views = await this.pensions.myBookings(current.userId);
    return ok(views.map(toBookingDto));
  }

  @Get('pension/bookings')
  @Auth()
  async pensionBookings(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<BookingDto[]>> {
    const views = await this.pensions.pensionBookings(current.userId);
    return ok(views.map(toBookingDto));
  }

  @Patch('pension/bookings/:id')
  @Auth()
  async updateBookingStatus(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<ApiResponse<BookingDto>> {
    const status = bodyEnumReq(dto.status, BOOKING_STATUS, 'status');
    const view = await this.pensions.setBookingStatus(current.userId, id, status);
    return ok(toBookingDto(view));
  }
}
