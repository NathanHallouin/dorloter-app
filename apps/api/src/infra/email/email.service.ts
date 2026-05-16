/**
 * Émetteur d'email transactionnel.
 *
 * Transport SMTP réel (nodemailer) dès que `EMAIL_SMTP_HOST` est renseigné,
 * sinon envoi no-op loggé : les flux qui notifient (décision de candidature,
 * contrat prêt, campagne) restent fonctionnels en dev sans SMTP.
 *
 * `send` ne lève jamais et renvoie le **statut de remise**. Ce booléen n'est
 * pas décoratif : la suppression des comptes inactifs ne s'enclenche que si la
 * relance a effectivement été remise. Sans transport configuré aucune relance
 * ne part, donc aucun compte n'est supprimé · le défaut est sûr.
 */

import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import { CONFIG, type Config } from '../../config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');
  private readonly transporter: Transporter | null;

  constructor(@Inject(CONFIG) private readonly config: Config) {
    const { host, port, user, password, secure } = config.email;
    if (!host) {
      this.transporter = null;
      this.logger.warn('SMTP non configuré (EMAIL_SMTP_HOST vide) : emails loggés, non envoyés.');
      return;
    }
    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    });
    this.logger.log(`SMTP configuré sur ${host}:${port}`);
  }

  /** `true` si l'email a bien été remis au serveur SMTP. */
  async send(
    toEmail: string,
    toName: string,
    subject: string,
    htmlBody: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`email (no-op, SMTP non branché) → ${toEmail} : ${subject}`);
      return false;
    }
    try {
      const { fromName, fromAddress } = this.config.email;
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: toName ? `"${toName}" <${toEmail}>` : toEmail,
        subject,
        html: htmlBody,
      });
      return true;
    } catch (error) {
      // Un email qui ne part pas ne doit jamais faire échouer l'action métier
      // qui l'a déclenché : une candidature reste acceptée sans son email.
      this.logger.error(`échec d'envoi → ${toEmail} : ${subject}`, error as Error);
      return false;
    }
  }
}

@Global()
@Module({ providers: [EmailService], exports: [EmailService] })
export class EmailModule {}
