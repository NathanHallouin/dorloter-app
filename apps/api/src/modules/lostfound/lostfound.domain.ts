/**
 * Entités du module LostFound (tables `reports`, `report_photos`,
 * `report_matches`). La position `location` (geometry Point 4326, NOT NULL) est
 * lue via `ST_Y`/`ST_X` en latitude/longitude.
 */

import { sql } from 'kysely';

/** Signalement d'un animal perdu ou trouvé, géolocalisé. */
export interface ReportRecord {
  id: string;
  user_id: string;
  type: string;
  status: string;
  species: string;
  pet_name: string | null;
  description: string;
  breed: string | null;
  color: string | null;
  sex: string;
  is_chipped: boolean;
  chip_number: string | null;
  distinctive_signs: string | null;
  lat: number;
  lng: number;
  address: string | null;
  date_event: string;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  resolved_at: Date | null;
  resolved_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Colonnes de `reports` (géo décomposée en lat/lng). */
export function reportColumns() {
  return [
    'id',
    'user_id',
    'type',
    'status',
    'species',
    'pet_name',
    'description',
    'breed',
    'color',
    'sex',
    'is_chipped',
    'chip_number',
    'distinctive_signs',
    sql<number>`ST_Y(location)`.as('lat'),
    sql<number>`ST_X(location)`.as('lng'),
    'address',
    'date_event',
    'contact_phone',
    'contact_email',
    'notes',
    'resolved_at',
    'resolved_by_user_id',
    'created_at',
    'updated_at',
  ] as const;
}

/** Type opposé (perdu <-> trouvé), utilisé pour chercher les correspondances. */
export function oppositeType(reportType: string): string {
  return reportType === 'perdu' ? 'trouve' : 'perdu';
}

/** Photo d'un signalement. */
export interface ReportPhotoRecord {
  id: string;
  report_id: string;
  url: string;
  blur_data_url: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: Date;
}

export function reportPhotoColumns() {
  return [
    'id',
    'report_id',
    'url',
    'blur_data_url',
    'is_primary',
    sql<number>`"order"`.as('display_order'),
    'created_at',
  ] as const;
}

/** Correspondance suggérée entre un « perdu » et un « trouvé ». */
export interface ReportMatchRecord {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  score: number;
  distance_meters: number | null;
  status: string;
  created_at: Date;
}

/** Colonnes de `report_matches` (score numeric lu en float8 pour un JSON number). */
export function reportMatchColumns() {
  return [
    'id',
    'lost_report_id',
    'found_report_id',
    sql<number>`score::float8`.as('score'),
    'distance_meters',
    'status',
    'created_at',
  ] as const;
}
