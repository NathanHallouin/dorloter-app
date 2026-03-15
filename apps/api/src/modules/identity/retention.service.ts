/**
 * Purge automatique des données arrivées au terme de leur durée de conservation
 * (RGPD art. 5.1.e · limitation de la conservation).
 *
 * Les durées sont la traduction littérale de ce qu'annonce la politique de
 * confidentialité publiée sur le site (apps/web · PrivacyPage). Toute
 * modification ici doit être répercutée là-bas, et réciproquement.
 *
 * Pourquoi une purge transverse plutôt qu'une purge par module : l'expiration
 * est une propriété de la donnée, pas du domaine métier qui la produit. Un
 * unique point de vérité vaut mieux que neuf purges dispersées dont on ne sait
 * plus laquelle couvre quoi. C'est le seul endroit du code qui écrit dans des
 * tables d'autres modules, et c'est délibéré.
 *
 * Ordonnancement : minuterie interne quotidienne, sans dépendance ajoutée. Le
 * déploiement de production ne fait tourner qu'une seule instance de l'API ;
 * si cela changeait, il faudrait passer à un verrou consultatif Postgres
 * (`pg_try_advisory_lock`) pour éviter deux passes concurrentes.
 */

import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import type { ExpressionBuilder } from 'kysely';

import { CONFIG, type Config } from '../../config';
import { DB, type Db } from '../../infra/database/database.module';
import type { Database } from '../../infra/database/schema';
import { EmailService } from '../../infra/email/email.service';
import { inactiveAccountWarning } from '../../infra/email/templates';
import { S3Service } from '../../infra/storage/s3.service';
import { PrivacyService } from './privacy.service';

/** Durées de conservation, en jours. */
const RETENTION = {
  /** Un signalement sans activité depuis un an bascule en « expiré ». */
  reportActiveDays: 365,
  /** Un signalement résolu ou expiré est effacé un an plus tard. */
  reportClosedDays: 365,
  /** Candidature close : conservée trois ans (délai de contestation). */
  applicationClosedDays: 3 * 365,
  /** Conversation sans échange depuis trois ans. */
  conversationIdleDays: 3 * 365,
  /** Notification lue ou non : un an. */
  notificationDays: 365,
  /** Signalement de modération traité (masqué ou rejeté). */
  moderationResolvedDays: 365,
  /**
   * Fiche bénévole passée en « inactive ». Trois ans : assez long pour qu'une
   * mise en sommeil temporaire ne soit pas emportée, assez court pour ne pas
   * conserver indéfiniment nom, email et téléphone d'une personne qui ne
   * participe plus.
   */
  volunteerInactiveDays: 3 * 365,
  /** Inactivité au-delà de laquelle un compte est relancé puis supprimé. */
  accountInactiveDays: 3 * 365,
  /** Délai laissé entre la relance et la suppression effective. */
  accountGraceDays: 30,
} as const;

/**
 * Nombre maximal de relances envoyées par passe. Évite qu'un premier balayage
 * sur une base ancienne ne déclenche des milliers d'emails d'un coup, ce qui
 * ferait passer le domaine pour un spammeur. Le reliquat part à la passe
 * suivante ; il est loggué pour ne pas être silencieux.
 */
const INACTIVITY_NOTICES_PER_RUN = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Statuts terminaux d'une candidature (le dossier est clos). */
const APPLICATION_CLOSED_STATUSES = ['acceptee', 'refusee', 'annulee'];

export interface RetentionReport {
  reportsExpired: number;
  reportsDeleted: number;
  applicationsDeleted: number;
  conversationsDeleted: number;
  notificationsDeleted: number;
  refreshTokensDeleted: number;
  moderationReportsDeleted: number;
  volunteersDeleted: number;
  /** Relances « compte inactif » effectivement remises. */
  inactivityNoticesSent: number;
  /** Comptes supprimés ou anonymisés faute de retour après relance. */
  inactiveAccountsDeleted: number;
}

@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CONFIG) private readonly config: Config,
    private readonly email: EmailService,
    private readonly privacy: PrivacyService,
    private readonly s3: S3Service,
  ) {}

  onModuleInit(): void {
    // Première passe peu après le démarrage, puis une fois par jour. `unref`
    // pour ne pas retenir le process au moment de l'arrêt.
    this.timer = setInterval(() => void this.runSafely(), DAY_MS);
    this.timer.unref();
    setTimeout(() => void this.runSafely(), 60_000).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Passe complète. Ne lève jamais : une purge ratée ne doit pas tuer l'API. */
  private async runSafely(): Promise<void> {
    try {
      const report = await this.run();
      const total = Object.values(report).reduce((a, b) => a + b, 0);
      if (total > 0) this.logger.log(`purge de rétention : ${JSON.stringify(report)}`);
    } catch (error) {
      this.logger.error('purge de rétention en échec', error as Error);
    }
  }

  async run(): Promise<RetentionReport> {
    const cutoff = (days: number): Date => new Date(Date.now() - days * DAY_MS);

    // 1. Signalements actifs et dormants -> expirés.
    const expired = await this.db
      .updateTable('reports')
      .set({ status: 'expire', updated_at: new Date() })
      .where('status', '=', 'actif')
      .where('updated_at', '<', cutoff(RETENTION.reportActiveDays))
      .executeTakeFirst();

    // 2. Signalements clos depuis assez longtemps -> effacés (photos et
    //    correspondances suivent par cascade). Les URL des photos sont relevées
    //    AVANT la suppression : une fois les lignes parties, plus rien ne
    //    permettrait de retrouver les objets à effacer du stockage.
    const closedCutoff = cutoff(RETENTION.reportClosedDays);
    const closedReports = (eb: ExpressionBuilder<Database, 'reports'>) =>
      eb.or([
        eb('resolved_at', '<', closedCutoff),
        eb.and([eb('resolved_at', 'is', null), eb('updated_at', '<', closedCutoff)]),
      ]);

    const doomedPhotos = await this.db
      .selectFrom('report_photos')
      .select('url')
      .where('report_id', 'in', (eb) =>
        eb
          .selectFrom('reports')
          .select('id')
          .where('status', 'in', ['resolu', 'expire'])
          .where(closedReports),
      )
      .execute();

    const deletedReports = await this.db
      .deleteFrom('reports')
      .where('status', 'in', ['resolu', 'expire'])
      .where(closedReports)
      .executeTakeFirst();

    await this.purgeStoredObjects(doomedPhotos.map((p) => p.url));

    // 3. Candidatures closes.
    const deletedApplications = await this.db
      .deleteFrom('applications')
      .where('status', 'in', APPLICATION_CLOSED_STATUSES)
      .where('updated_at', '<', cutoff(RETENTION.applicationClosedDays))
      .executeTakeFirst();

    // 4. Conversations sans échange récent (les messages suivent par cascade).
    const deletedConversations = await this.db
      .deleteFrom('conversations')
      .where('last_message_at', '<', cutoff(RETENTION.conversationIdleDays))
      .executeTakeFirst();

    // 5. Notifications anciennes.
    const deletedNotifications = await this.db
      .deleteFrom('notifications')
      .where('created_at', '<', cutoff(RETENTION.notificationDays))
      .executeTakeFirst();

    // 6. Jetons de rafraîchissement expirés ou révoqués : aucune raison de les
    //    garder au-delà de leur validité.
    const deletedTokens = await this.db
      .deleteFrom('auth_refresh_tokens')
      .where((eb) =>
        eb.or([eb('expires_at', '<', new Date()), eb('revoked_at', 'is not', null)]),
      )
      .executeTakeFirst();

    // 7. Signalements de modération traités : le dossier est clos, il n'y a
    //    plus de raison de garder qui a signalé quoi.
    const deletedModeration = await this.db
      .deleteFrom('content_reports')
      .where('status', 'in', ['masque', 'rejete'])
      .where('resolved_at', '<', cutoff(RETENTION.moderationResolvedDays))
      .executeTakeFirst();

    // 8. Fiches bénévoles inactives de longue date. Ces personnes n'ont pas
    //    nécessairement de compte : leurs coordonnées sont saisies par le
    //    refuge, et rien d'autre ne viendrait les effacer.
    const deletedVolunteers = await this.db
      .deleteFrom('volunteers')
      .where('status', '=', 'inactive')
      .where('updated_at', '<', cutoff(RETENTION.volunteerInactiveDays))
      .executeTakeFirst();

    // 9. Comptes inactifs : relance, puis suppression après le délai de grâce.
    const inactivity = await this.handleInactiveAccounts();

    return {
      reportsExpired: Number(expired?.numUpdatedRows ?? 0n),
      reportsDeleted: Number(deletedReports?.numDeletedRows ?? 0n),
      applicationsDeleted: Number(deletedApplications?.numDeletedRows ?? 0n),
      conversationsDeleted: Number(deletedConversations?.numDeletedRows ?? 0n),
      notificationsDeleted: Number(deletedNotifications?.numDeletedRows ?? 0n),
      refreshTokensDeleted: Number(deletedTokens?.numDeletedRows ?? 0n),
      moderationReportsDeleted: Number(deletedModeration?.numDeletedRows ?? 0n),
      volunteersDeleted: Number(deletedVolunteers?.numDeletedRows ?? 0n),
      ...inactivity,
    };
  }

  /**
   * Efface du stockage les objets dont la ligne vient de disparaître.
   *
   * Best-effort et jamais bloquant : un objet resté orphelin est un défaut
   * d'hygiène, pas une raison d'interrompre une purge. Les URL qui ne
   * proviennent pas de notre bucket (photo pointant vers un site externe) sont
   * ignorées.
   */
  private async purgeStoredObjects(urls: string[]): Promise<void> {
    for (const url of urls) {
      const key = this.s3.keyFromPublicUrl(url);
      if (key) await this.s3.deleteObject(key);
    }
  }

  /**
   * Comptes inactifs, en deux temps : relance, puis suppression.
   *
   * Deux garde-fous délibérés :
   *
   *   - **Aucune suppression sans relance remise.** `inactivity_notified_at`
   *     n'est posée que si l'email est effectivement parti. Sans transport
   *     SMTP configuré, la phase 1 ne marque rien, donc la phase 2 ne trouve
   *     rien : le défaut est de ne rien supprimer.
   *   - **Les comptes rattachés à une structure sont exclus.** Supprimer le
   *     compte d'un responsable de refuge peu connecté couperait l'accès de
   *     toute son équipe. Leur sort relève d'une décision humaine, pas d'un
   *     balayage automatique.
   *
   * Une reconnexion remet `inactivity_notified_at` à NULL (cf. IdentityService),
   * ce qui sort le compte de la file.
   */
  private async handleInactiveAccounts(): Promise<{
    inactivityNoticesSent: number;
    inactiveAccountsDeleted: number;
  }> {
    const inactiveSince = new Date(Date.now() - RETENTION.accountInactiveDays * DAY_MS);
    const noticedBefore = new Date(Date.now() - RETENTION.accountGraceDays * DAY_MS);

    // Phase 2 d'abord : les comptes relancés dont le délai de grâce est écoulé
    // et qui ne se sont pas manifestés depuis.
    const expiredNotice = await this.eligibleAccounts()
      .where('inactivity_notified_at', 'is not', null)
      .where('inactivity_notified_at', '<', noticedBefore)
      .where('last_seen_at', '<', inactiveSince)
      .execute();

    let deleted = 0;
    for (const account of expiredNotice) {
      try {
        await this.privacy.deleteAccount(account.id);
        deleted += 1;
      } catch (error) {
        this.logger.error(`suppression du compte inactif ${account.id} en échec`, error as Error);
      }
    }

    // Phase 1 : relance des comptes inactifs pas encore prévenus.
    const toNotify = await this.eligibleAccounts()
      .where('inactivity_notified_at', 'is', null)
      .where('last_seen_at', '<', inactiveSince)
      .limit(INACTIVITY_NOTICES_PER_RUN + 1)
      .execute();

    const batch = toNotify.slice(0, INACTIVITY_NOTICES_PER_RUN);
    if (toNotify.length > batch.length) {
      this.logger.log(
        `relances plafonnées à ${INACTIVITY_NOTICES_PER_RUN} pour cette passe, reliquat à la suivante`,
      );
    }

    const inactiveYears = Math.round(RETENTION.accountInactiveDays / 365);
    const loginUrl = `${this.config.publicWebUrl}/login`;

    let notified = 0;
    for (const account of batch) {
      const mail = inactiveAccountWarning(
        account.name,
        inactiveYears,
        RETENTION.accountGraceDays,
        loginUrl,
      );
      const delivered = await this.email.send(
        account.email,
        account.name,
        mail.subject,
        mail.html,
      );
      if (!delivered) continue; // pas de relance remise, pas de compte à risque

      await this.db
        .updateTable('users')
        .set({ inactivity_notified_at: new Date() })
        .where('id', '=', account.id)
        .execute();
      notified += 1;
    }

    if (batch.length > 0 && notified === 0) {
      this.logger.warn(
        `${batch.length} compte(s) inactif(s) détecté(s) mais aucune relance remise ` +
          '(SMTP non configuré ?) : aucune suppression ne sera engagée.',
      );
    }

    return { inactivityNoticesSent: notified, inactiveAccountsDeleted: deleted };
  }

  /**
   * Base commune des deux phases : comptes ordinaires uniquement. Les rôles
   * professionnels et les membres d'équipe d'un refuge sont hors périmètre.
   */
  private eligibleAccounts() {
    return this.db
      .selectFrom('users')
      .select(['id', 'email', 'name'])
      .where('role', '=', 'user')
      .where('shelter_id', 'is', null)
      .where('pension_id', 'is', null)
      .where(({ not, exists, selectFrom }) =>
        not(
          exists(
            selectFrom('shelter_members')
              .select('shelter_members.user_id')
              .whereRef('shelter_members.user_id', '=', 'users.id'),
          ),
        ),
      );
  }
}
