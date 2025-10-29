/**
 * API publique du module Shelters : résout des refuges en résumés pour les autres
 * bounded contexts (Adoption, Messaging, Foster), sans exposer l'entité interne.
 */

import { Inject, Injectable } from '@nestjs/common';

import { DB, type Db } from '../../infra/database/database.module';

/** Résumé public d'un refuge exposé aux autres modules. */
export interface ShelterSummary {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  isVerified: boolean;
  acceptsFosterApplications: boolean;
}

@Injectable()
export class ShelterDirectory {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findSummary(id: string): Promise<ShelterSummary | null> {
    const row = await this.db
      .selectFrom('shelters')
      .select(['id', 'slug', 'name', 'address', 'is_verified', 'accepts_foster_applications'])
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toSummary(row) : null;
  }

  /** Résout un lot d'ids en une seule requête (évite le N+1 sur les listes). */
  async findSummaries(ids: string[]): Promise<Map<string, ShelterSummary>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .selectFrom('shelters')
      .select(['id', 'slug', 'name', 'address', 'is_verified', 'accepts_foster_applications'])
      .where('id', 'in', ids)
      .execute();
    return new Map(rows.map((row) => [row.id, toSummary(row)]));
  }
}

function toSummary(row: {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  is_verified: boolean;
  accepts_foster_applications: boolean;
}): ShelterSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    isVerified: row.is_verified,
    acceptsFosterApplications: row.accepts_foster_applications,
  };
}
