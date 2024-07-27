/**
 * DTOs shelters — payloads API stables pour les refuges et associations.
 *
 * Deux versions :
 *   - `ShelterSummaryDto` (liste, annuaire) : infos essentielles + counts
 *   - `ShelterDto` (fiche détail) : tout, y compris coordonnées et mission
 *
 * Le `siret` est exposé volontairement — c'est public légalement (les
 * associations doivent l'afficher) et sert au client à afficher le
 * tampon "vérifié par Dorloter — SIRET XXX".
 */

import type { ShelterDetail, ShelterSummary } from "@shelters/public";

export interface ShelterSummaryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  foundedYear: number | null;
  available: number;
  adopted: number;
}

export interface ShelterDto extends ShelterSummaryDto {
  missionLong: string | null;
  siret: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  donationUrl: string | null;
  visitHours: string | null;
  location: { latitude: number; longitude: number } | null;
  reserved: number;
  followers: number;
  createdAt: string;
  updatedAt: string;
}

export function toShelterSummaryDto(
  shelter: ShelterSummary
): ShelterSummaryDto {
  return {
    id: shelter.id,
    slug: shelter.slug,
    name: shelter.name,
    description: shelter.description,
    address: shelter.address,
    logoUrl: shelter.logoUrl,
    coverUrl: shelter.coverUrl,
    isVerified: shelter.isVerified,
    foundedYear: shelter.foundedYear,
    available: shelter.available,
    adopted: shelter.adopted,
  };
}

export function toShelterDto(shelter: ShelterDetail): ShelterDto {
  return {
    id: shelter.id,
    slug: shelter.slug,
    name: shelter.name,
    description: shelter.description,
    address: shelter.address,
    logoUrl: shelter.logoUrl,
    coverUrl: shelter.coverUrl,
    isVerified: shelter.isVerified,
    foundedYear: shelter.foundedYear,
    available: shelter.available,
    adopted: shelter.adopted,
    missionLong: shelter.missionLong,
    siret: shelter.siret,
    phone: shelter.phone,
    email: shelter.email,
    website: shelter.website,
    donationUrl: shelter.donationUrl,
    visitHours: shelter.visitHours,
    location: shelter.location,
    reserved: shelter.reserved,
    followers: shelter.followers,
    createdAt: shelter.createdAt.toISOString(),
    updatedAt: shelter.updatedAt.toISOString(),
  };
}
