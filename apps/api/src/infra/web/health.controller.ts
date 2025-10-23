/** Sonde de disponibilité : API vivante + base de données joignable. */

import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'kysely';

import { ok, type ApiResponse } from '../../shared/api-response';
import { DB, type Db } from '../database/database.module';

@Controller('api/v1/health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async health(): Promise<ApiResponse<{ status: string; database: boolean }>> {
    const databaseOk = await sql`SELECT 1`
      .execute(this.db)
      .then(() => true)
      .catch(() => false);
    return ok({ status: databaseOk ? 'ok' : 'degraded', database: databaseOk });
  }
}
