import { Global, Module } from '@nestjs/common';

import { S3Service } from './s3.service';

/** Stockage objet, disponible partout (uploads, purge de rétention). */
@Global()
@Module({ providers: [S3Service], exports: [S3Service] })
export class StorageModule {}
