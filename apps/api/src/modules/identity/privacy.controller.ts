/**
 * Exercice des droits RGPD par l'utilisateur connecté :
 *   GET    /api/v1/me/export   accès et portabilité (art. 15 et 20)
 *   DELETE /api/v1/me          effacement (art. 17)
 *
 * S'y ajoute un déclenchement manuel de la purge de rétention, réservé à
 * l'administration de la plateforme (la purge tourne d'elle-même une fois par
 * jour ; l'endpoint sert au contrôle et aux tests de recette).
 */

import { Controller, Delete, Get, Post } from '@nestjs/common';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { PrivacyService, type DeletionOutcome } from './privacy.service';
import { RetentionService, type RetentionReport } from './retention.service';

interface DeletionResultDto {
  /** `supprime` : effacement total. `anonymise` : contrat conservé, fiche vidée. */
  outcome: DeletionOutcome;
  message: string;
}

@Controller('api/v1')
export class PrivacyController {
  constructor(
    private readonly privacy: PrivacyService,
    private readonly retention: RetentionService,
  ) {}

  @Get('me/export')
  @Auth()
  async exportMyData(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return ok(await this.privacy.exportUserData(current.userId));
  }

  @Delete('me')
  @Auth()
  async deleteMyAccount(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<DeletionResultDto>> {
    const outcome = await this.privacy.deleteAccount(current.userId);
    return ok({
      outcome,
      message:
        outcome === 'supprime'
          ? 'Votre compte et vos données ont été supprimés.'
          : "Vos données ont été effacées. Seuls les contrats d'adoption signés sont conservés comme justificatifs, sans lien avec votre identité.",
    });
  }

  @Post('admin/retention/run')
  @Auth()
  async runRetention(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<RetentionReport>> {
    current.requireRole('platform_admin');
    return ok(await this.retention.run());
  }
}
