/**
 * Émetteur d'email transactionnel.
 *
 * Le transport SMTP réel reste à brancher (gap infra). Pour l'instant, envoi
 * no-op loggé : ne lève jamais, pour que les flux qui notifient (décision de
 * candidature, contrat envoyé, campagne) fonctionnent sans SMTP configuré.
 */

import { Global, Injectable, Logger, Module } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');

  async send(
    toEmail: string,
    _toName: string,
    subject: string,
    _htmlBody: string,
  ): Promise<void> {
    this.logger.log(`email (no-op, SMTP non branché) → ${toEmail} : ${subject}`);
  }
}

@Global()
@Module({ providers: [EmailService], exports: [EmailService] })
export class EmailModule {}
