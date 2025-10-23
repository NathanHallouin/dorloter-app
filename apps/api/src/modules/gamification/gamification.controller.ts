/**
 * Module Gamification : crédits de résolution (retrouvailles confirmées).
 * Compteur exposé au profil, attribution idempotente réutilisable par LostFound.
 */

import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';

@Injectable()
export class GamificationService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Attribue un crédit (idempotent : un seul par report/user/rôle). Rôle :
   * `author` ou `matcher`. Réutilisable à la confirmation d'une retrouvaille.
   */
  async award(reportId: string, userId: string, role: string): Promise<void> {
    await this.db
      .insertInto('resolution_credits')
      .values({ report_id: reportId, user_id: userId, role })
      .onConflict((oc) => oc.columns(['report_id', 'user_id', 'role']).doNothing())
      .execute();
  }

  async countFor(userId: string): Promise<number> {
    const row = await this.db
      .selectFrom('resolution_credits')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirstOrThrow();
    return row.count;
  }
}

@Controller('api/v1/me/credits')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get()
  @Auth()
  async myCredits(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<{ count: number }>> {
    return ok({ count: await this.gamification.countFor(current.userId) });
  }
}

@Module({
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
