import { Module } from '@nestjs/common';

import { IdentityController } from './identity.controller';
import { UserDirectory } from './identity.directory';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, UserDirectory],
  exports: [UserDirectory],
})
export class IdentityModule {}
