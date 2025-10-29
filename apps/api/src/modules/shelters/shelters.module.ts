import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { PublicEventsController } from './public-events.controller';
import { ShelterCommunicationsController } from './shelter-communications.controller';
import { ShelterDirectory } from './shelter-directory.service';
import { ShelterEventsController } from './shelter-events.controller';
import { ShelterInventoryController } from './shelter-inventory.controller';
import { ShelterMembershipService } from './shelter-membership.service';
import { ShelterStatsController } from './shelter-stats.controller';
import { ShelterTemplatesController } from './shelter-templates.controller';
import { ShelterVolunteeringController } from './shelter-volunteering.controller';
import { SheltersController } from './shelters.controller';
import { SheltersService } from './shelters.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    SheltersController,
    ShelterStatsController,
    ShelterTemplatesController,
    ShelterInventoryController,
    ShelterCommunicationsController,
    ShelterVolunteeringController,
    ShelterEventsController,
    PublicEventsController,
  ],
  providers: [SheltersService, ShelterMembershipService, ShelterDirectory],
  exports: [SheltersService, ShelterMembershipService, ShelterDirectory],
})
export class SheltersModule {}
