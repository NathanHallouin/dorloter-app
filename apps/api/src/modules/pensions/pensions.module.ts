import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { PensionsController } from './pensions.controller';
import { PensionsService } from './pensions.service';

@Module({
  imports: [IdentityModule],
  controllers: [PensionsController],
  providers: [PensionsService],
})
export class PensionsModule {}
