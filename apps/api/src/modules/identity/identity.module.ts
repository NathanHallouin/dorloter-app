import { Module } from '@nestjs/common';

import { IdentityController } from './identity.controller';
import { UserDirectory } from './identity.directory';
import { IdentityService } from './identity.service';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { RetentionService } from './retention.service';

@Module({
  controllers: [IdentityController, PrivacyController],
  providers: [IdentityService, UserDirectory, PrivacyService, RetentionService],
  exports: [UserDirectory],
})
export class IdentityModule {}
