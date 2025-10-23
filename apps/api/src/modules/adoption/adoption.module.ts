import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SheltersModule } from '../shelters/shelters.module';
import { AdoptionBackofficeController } from './adoption-backoffice.controller';
import { AdoptionContractsController } from './adoption-contracts.controller';
import { AdoptionDigestController } from './adoption-digest.controller';
import { AdoptionFollowupsController } from './adoption-followups.controller';
import { AdoptionFollowupsService } from './adoption-followups.service';
import { AdoptionFosterController } from './adoption-foster.controller';
import { AdoptionHealthController } from './adoption-health.controller';
import { AdoptionRegistreController } from './adoption-registre.controller';
import { AdoptionController } from './adoption.controller';
import { AdoptionService } from './adoption.service';

/**
 * Module Adoption : catalogue public + favoris/candidatures adoptant +
 * back-office refuge (animaux, candidatures, contrats, familles d'accueil,
 * santé, registre entrée/sortie, suivi post-adoption, digest de proximité).
 */
@Module({
  imports: [IdentityModule, SheltersModule, NotificationsModule],
  controllers: [
    AdoptionController,
    AdoptionBackofficeController,
    AdoptionContractsController,
    AdoptionFollowupsController,
    AdoptionFosterController,
    AdoptionHealthController,
    AdoptionRegistreController,
    AdoptionDigestController,
  ],
  providers: [AdoptionService, AdoptionFollowupsService],
})
export class AdoptionModule {}
