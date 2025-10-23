import { Global, Module } from '@nestjs/common';

import { JwtAuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';
import { ScryptService } from './scrypt.service';

@Global()
@Module({
  providers: [JwtService, ScryptService, JwtAuthGuard],
  exports: [JwtService, ScryptService, JwtAuthGuard],
})
export class SecurityModule {}
