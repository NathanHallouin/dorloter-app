import { Module } from '@nestjs/common';

import { SheltersModule } from '../shelters/shelters.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({
  imports: [SheltersModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
