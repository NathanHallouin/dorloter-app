import { Global, Module } from '@nestjs/common';

import { CONFIG, loadConfig, type Config } from './config';

/** Expose la configuration applicative à tous les modules (jeton `CONFIG`). */
@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: (): Config => loadConfig() }],
  exports: [CONFIG],
})
export class ConfigModule {}
