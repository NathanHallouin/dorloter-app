/**
 * Endpoints du module Shelters : annuaire public + fiche, suivi, fiche
 * back-office (profil), réglages (familles d'accueil) et équipe (membres/rôles).
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
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, page, type ApiResponse, type PageResponse } from '../../shared/api-response';
import { clean, toIso } from '../../shared/format';
import { clampLimit, queryInt, queryString } from '../../shared/validation';
import {
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateShelterProfileDto,
  UpdateShelterSettingsDto,
} from './dto/shelters.dto';
import { ShelterMembershipService, type MemberView } from './shelter-membership.service';
import {
  MAX_LIMIT,
  SHELTER_DEFAULT_LIMIT,
  SheltersService,
  type ShelterRecord,
} from './shelters.service';

interface LocationDto {
  latitude: number;
  longitude: number;
}

/** Résumé d'un refuge pour l'annuaire public. */
interface ShelterSummaryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  location: LocationDto | null;
}

/** Fiche détaillée d'un refuge. */
interface ShelterDto extends ShelterSummaryDto {
  missionLong: string | null;
  foundedYear: number | null;
  siret: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  donationUrl: string | null;
  donationLabel: string | null;
  donationDescription: string | null;
  visitHours: string | null;
  isVerified: boolean;
  acceptsFosterApplications: boolean;
  createdAt: string;
  updatedAt: string;
}

function locationOf(shelter: ShelterRecord): LocationDto | null {
  return shelter.lat !== null && shelter.lng !== null
    ? { latitude: shelter.lat, longitude: shelter.lng }
    : null;
}

function toSummaryDto(s: ShelterRecord): ShelterSummaryDto {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    address: s.address,
    logoUrl: s.logo_url,
    coverUrl: s.cover_url,
    location: locationOf(s),
  };
}

function toShelterDto(s: ShelterRecord): ShelterDto {
  return {
    ...toSummaryDto(s),
    missionLong: s.mission_long,
    foundedYear: s.founded_year,
    siret: s.siret,
    phone: s.phone,
    email: s.email,
    website: s.website,
    donationUrl: s.donation_url,
    donationLabel: s.donation_label,
    donationDescription: s.donation_description,
    visitHours: s.visit_hours,
    isVerified: s.is_verified,
    acceptsFosterApplications: s.accepts_foster_applications,
    createdAt: toIso(s.created_at),
    updatedAt: toIso(s.updated_at),
  };
}

@Controller('api/v1')
export class SheltersController {
  constructor(
    private readonly shelters: SheltersService,
    private readonly membership: ShelterMembershipService,
  ) {}

  // --- Public ---------------------------------------------------------------------

  @Get('shelters')
  async list(
    @Query() query: Record<string, unknown>,
  ): Promise<PageResponse<ShelterSummaryDto>> {
    const limit = clampLimit(queryInt(query.limit, 'limit'), SHELTER_DEFAULT_LIMIT, MAX_LIMIT);
    const result = await this.shelters.list(
      queryString(query.search),
      queryString(query.cursor),
      limit,
    );
    return page(result.items.map(toSummaryDto), result.nextCursor);
  }

  @Get('shelters/:slug')
  async get(@Param('slug') slug: string): Promise<ApiResponse<ShelterDto>> {
    return ok(toShelterDto(await this.shelters.getBySlug(slug)));
  }

  // --- Suivi ----------------------------------------------------------------------

  @Post('shelters/:id/follow')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.shelters.follow(current.userId, id);
  }

  @Delete('shelters/:id/follow')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.shelters.unfollow(current.userId, id);
  }

  @Get('me/shelters')
  @Auth()
  async myFollowed(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<ShelterSummaryDto[]>> {
    const shelters = await this.shelters.listFollowed(current.userId);
    return ok(shelters.map(toSummaryDto));
  }

  // --- Back-office : profil + réglages --------------------------------------------

  @Get('shelter/profile')
  @Auth()
  async profile(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<ShelterDto>> {
    return ok(toShelterDto(await this.shelters.getMine(current.userId)));
  }

  @Patch('shelter/profile')
  @Auth()
  async updateProfile(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: UpdateShelterProfileDto,
  ): Promise<ApiResponse<ShelterDto>> {
    const shelter = await this.shelters.updateProfile(current.userId, {
      name: dto.name.trim(),
      description: clean(dto.description),
      missionLong: clean(dto.missionLong),
      foundedYear: dto.foundedYear ?? null,
      siret: clean(dto.siret),
      address: clean(dto.address),
      phone: clean(dto.phone),
      email: clean(dto.email),
      website: clean(dto.website),
      visitHours: clean(dto.visitHours),
      donationUrl: clean(dto.donationUrl),
      donationLabel: clean(dto.donationLabel),
      donationDescription: clean(dto.donationDescription),
      logoUrl: clean(dto.logoUrl),
      coverUrl: clean(dto.coverUrl),
    });
    return ok(toShelterDto(shelter));
  }

  @Get('shelter/settings')
  @Auth()
  async settings(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<{ acceptsFosterApplications: boolean }>> {
    return ok({ acceptsFosterApplications: await this.shelters.fosteringOpen(current.userId) });
  }

  @Patch('shelter/settings')
  @Auth()
  async updateSettings(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: UpdateShelterSettingsDto,
  ): Promise<ApiResponse<{ acceptsFosterApplications: boolean }>> {
    await this.shelters.setFosteringOpen(current.userId, dto.acceptsFosterApplications);
    return ok({ acceptsFosterApplications: dto.acceptsFosterApplications });
  }

  // --- Back-office : équipe --------------------------------------------------------

  @Get('shelter/members')
  @Auth()
  async members(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<MemberView[]>> {
    return ok(await this.membership.listMembers(current.userId));
  }

  @Post('shelter/members')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: InviteMemberDto,
  ): Promise<ApiResponse<MemberView>> {
    return ok(await this.membership.invite(current.userId, dto.email, dto.role));
  }

  @Patch('shelter/members/:id')
  @Auth()
  async updateMemberRole(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<ApiResponse<MemberView>> {
    return ok(await this.membership.updateRole(current.userId, id, dto.role));
  }

  @Delete('shelter/members/:id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.membership.remove(current.userId, id);
  }
}
