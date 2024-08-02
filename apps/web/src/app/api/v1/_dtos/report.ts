/**
 * DTOs reports — payloads API stables pour les signalements perdus / trouvés.
 *
 * Sécurité : les champs `contactPhone` et `contactEmail` ne sont **jamais**
 * exposés dans ces DTOs. Le détail retourne `hasContact: boolean` ; la
 * révélation passe par un endpoint dédié, rate-limité et loggué.
 */

import type {
  ReportDetail,
  ReportPhotoEntity,
  ReportSummary,
} from "@lost-found/public";

export interface ReportSummaryDto {
  id: string;
  type: "perdu" | "trouve";
  status: "actif" | "resolu" | "expire";
  species: "chat" | "chien";
  petName: string | null;
  breed: string | null;
  color: string | null;
  sex: "male" | "femelle" | "inconnu";
  dateEvent: string; // ISO YYYY-MM-DD
  address: string | null;
  location: { latitude: number; longitude: number };
  primaryPhoto: { url: string; blurDataUrl: string | null } | null;
  /** En mètres si la requête passait `near`, sinon null. */
  distanceMeters: number | null;
}

export interface ReportPhotoDto {
  id: string;
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
  order: number;
}

export interface ReportDto extends Omit<ReportSummaryDto, "primaryPhoto"> {
  description: string;
  isChipped: boolean;
  chipNumber: string | null;
  distinctiveSigns: string | null;
  notes: string | null;
  photos: ReportPhotoDto[];
  /** Indique si un contact est disponible — voir endpoint `reveal-contact`. */
  hasContact: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toReportSummaryDto(report: ReportSummary): ReportSummaryDto {
  return {
    id: report.id,
    type: report.type,
    status: report.status,
    species: report.species,
    petName: report.petName,
    breed: report.breed,
    color: report.color,
    sex: report.sex,
    dateEvent: report.dateEvent,
    address: report.address,
    location: report.location,
    primaryPhoto: report.primaryPhoto,
    distanceMeters:
      report.distanceMeters !== null ? Math.round(report.distanceMeters) : null,
  };
}

function toReportPhotoDto(photo: ReportPhotoEntity): ReportPhotoDto {
  return {
    id: photo.id,
    url: photo.url,
    blurDataUrl: photo.blurDataUrl,
    isPrimary: photo.isPrimary,
    order: photo.order,
  };
}

export function toReportDto(report: ReportDetail): ReportDto {
  return {
    id: report.id,
    type: report.type,
    status: report.status,
    species: report.species,
    petName: report.petName,
    breed: report.breed,
    color: report.color,
    sex: report.sex,
    dateEvent: report.dateEvent,
    address: report.address,
    location: report.location,
    description: report.description,
    isChipped: report.isChipped,
    chipNumber: report.chipNumber,
    distinctiveSigns: report.distinctiveSigns,
    notes: report.notes,
    photos: report.photos.map(toReportPhotoDto),
    hasContact: report.hasContact,
    distanceMeters:
      report.distanceMeters !== null ? Math.round(report.distanceMeters) : null,
    resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
