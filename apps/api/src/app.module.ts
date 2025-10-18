import { Module } from '@nestjs/common';

import { ConfigModule } from './config.module';
import { DatabaseModule } from './infra/database/database.module';
import { EmailModule } from './infra/email/email.service';
import { SecurityModule } from './infra/security/security.module';
import { HealthController } from './infra/web/health.controller';
import { OpenApiController } from './infra/web/openapi.controller';
import { AdoptionModule } from './modules/adoption/adoption.module';
import { GamificationModule } from './modules/gamification/gamification.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { LostFoundModule } from './modules/lostfound/lostfound.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ModerationModule } from './modules/moderation/moderation.controller';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PensionsModule } from './modules/pensions/pensions.module';
import { SheltersModule } from './modules/shelters/shelters.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SecurityModule,
    EmailModule,
    IdentityModule,
    SheltersModule,
    AdoptionModule,
    LostFoundModule,
    PensionsModule,
    NotificationsModule,
    MessagingModule,
    GamificationModule,
    ModerationModule,
  ],
  controllers: [HealthController, OpenApiController],
})
export class AppModule {}
