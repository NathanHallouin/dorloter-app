/**
 * DTOs pensions — payloads API stables pour les pensions agréées.
 *
 * Le SIRET est volontairement exposé : c'est une information publique
 * légalement (registre INSEE) et il sert au client à afficher la
 * mention "agrément vérifié — SIRET XXXX".
 */

import type {
  PensionDetail,
  PensionPhotoEntity,
  PensionSummary,
  PensionServiceKey,
} from "@pensions/public";

export interface PensionRatingDto {
  /** Moyenne 1-5, deux décimales. */
  average: number;
  /** Nombre d'avis publiés. */
  count: number;
}

export interface PensionSummaryDto {
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
  rating: PensionRatingDto | null;
}

export interface PensionPhotoDto {
  id: string;
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
  order: number;
}

export interface PensionDto extends PensionSummaryDto {
  siret: string;
  agrementNumber: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: { latitude: number; longitude: number } | null;
  capacityCats: number | null;
  capacityDogs: number | null;
  services: Record<PensionServiceKey, boolean>;
  openingHours: string | null;
  photos: PensionPhotoDto[];
  createdAt: string;
  updatedAt: string;
}

function decimalToNumber(d: string | null): number | null {
  if (d === null) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

export function toPensionSummaryDto(
  pension: PensionSummary
): PensionSummaryDto {
  return {
    id: pension.id,
    slug: pension.slug,
    name: pension.name,
    description: pension.description,
    address: pension.address,
    logoUrl: pension.logoUrl,
    coverUrl: pension.coverUrl,
    acceptsCats: pension.acceptsCats,
    acceptsDogs: pension.acceptsDogs,
    pricePerDayCat: decimalToNumber(pension.pricePerDayCat),
    pricePerDayDog: decimalToNumber(pension.pricePerDayDog),
    rating: pension.rating
      ? {
          average: Math.round(pension.rating.average * 100) / 100,
          count: pension.rating.count,
        }
      : null,
  };
}

function toPensionPhotoDto(photo: PensionPhotoEntity): PensionPhotoDto {
  return {
    id: photo.id,
    url: photo.url,
    blurDataUrl: photo.blurDataUrl,
    isPrimary: photo.isPrimary,
    order: photo.order,
  };
}

export function toPensionDto(pension: PensionDetail): PensionDto {
  return {
    ...toPensionSummaryDto(pension),
    siret: pension.siret,
    agrementNumber: pension.agrementNumber,
    phone: pension.phone,
    email: pension.email,
    website: pension.website,
    location: pension.location,
    capacityCats: pension.capacityCats,
    capacityDogs: pension.capacityDogs,
    services: pension.services,
    openingHours: pension.openingHours,
    photos: pension.photos.map(toPensionPhotoDto),
    createdAt: pension.createdAt.toISOString(),
    updatedAt: pension.updatedAt.toISOString(),
  };
}
