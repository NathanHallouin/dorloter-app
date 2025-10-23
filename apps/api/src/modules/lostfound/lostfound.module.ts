import { Module } from '@nestjs/common';

import { LostFoundController } from './lostfound.controller';
import { LostFoundService } from './lostfound.service';
import { MatchingService } from './matching.service';

@Module({
  controllers: [LostFoundController],
  providers: [LostFoundService, MatchingService],
})
export class LostFoundModule {}
