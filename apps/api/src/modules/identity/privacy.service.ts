/**
 * Droits RGPD des personnes : accès et portabilité (art. 15 et 20) via l'export,
 * effacement (art. 17) via la suppression de compte.
 *
 * Deux chemins d'effacement, selon ce que la loi permet :
 *
 *   - Suppression pure quand rien ne s'y oppose. Les clés étrangères sont en
 *     ON DELETE CASCADE : supprimer la ligne `users` emporte tout le reste.
 *   - Anonymisation quand l'utilisateur a signé un contrat d'adoption ou porte
 *     un suivi post-adoption (`contracts` et `adoption_followups` sont en
 *     ON DELETE RESTRICT). Ces pièces doivent être conservées comme
 *     justificatifs ; on efface alors tout le reste et on vide la fiche de
 *     toute donnée identifiante, de sorte que le contrat subsiste sans être
 *     rattachable à une personne.
 *
 * Dans les deux cas les identifiants de connexion partent immédiatement : le
 * compte n'est plus utilisable.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { S3Service } from '../../infra/storage/s3.service';
import { toIso } from '../../shared/format';

/** Domaine non routable réservé aux tests (RFC 2606), pour les emails neutralisés. */
const ANONYMISED_EMAIL_DOMAIN = 'dorloter.invalid';

export type DeletionOutcome = 'supprime' | 'anonymise';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly s3: S3Service,
  ) {}

  /**
   * Rassemble tout ce que la plateforme détient sur un utilisateur, dans un
   * format directement réutilisable (art. 20 : « lisible par machine »).
   */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.db
      .selectFrom('users')
      .select([
        'id',
        'email',
        'name',
        'image',
        'role',
        'phone',
        'bio',
        'city',
        'is_public',
        'notification_radius_km',
        'digest_optin',
        'email_verified',
        'created_at',
        'updated_at',
        sql<number | null>`public.ST_Y(location::geometry)`.as('location_lat'),
        sql<number | null>`public.ST_X(location::geometry)`.as('location_lng'),
      ])
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();

    const [
      reports,
      applications,
      favorites,
      conversations,
      messages,
      notifications,
      bookings,
      reviews,
      contracts,
      follows,
    ] = await Promise.all([
      this.db
        .selectFrom('reports')
        .select([
          'id',
          'type',
          'status',
          'species',
          'pet_name',
          'description',
          'breed',
          'color',
          'sex',
          'is_chipped',
          'chip_number',
          'distinctive_signs',
          'address',
          'date_event',
          'contact_phone',
          'contact_email',
          'notes',
          'created_at',
          sql<number | null>`public.ST_Y(location::geometry)`.as('latitude'),
          sql<number | null>`public.ST_X(location::geometry)`.as('longitude'),
        ])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('applications')
        .select([
          'id',
          'pet_id',
          'status',
          'housing_type',
          'has_outdoor_access',
          'has_other_pets',
          'has_children',
          'children_ages',
          'experience',
          'motivation',
          'availability',
          'created_at',
        ])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('favorites')
        .select(['pet_id', 'created_at'])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('conversations')
        .select(['id', 'shelter_id', 'created_at'])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('messages')
        .select(['id', 'conversation_id', 'content', 'attachment_url', 'created_at'])
        .where('sender_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('notifications')
        .select(['id', 'type', 'title', 'body', 'is_read', 'created_at'])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('pension_bookings')
        .select(['id', 'pension_id', 'status', 'start_date', 'end_date', 'created_at'])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('pension_reviews')
        .select(['id', 'pension_id', 'rating', 'comment', 'created_at'])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('contracts')
        .select(['id', 'type', 'status', 'reference', 'effective_date', 'end_date', 'created_at'])
        .where('user_id', '=', userId)
        .execute(),
      this.db
        .selectFrom('shelter_follows')
        .select(['shelter_id', 'created_at'])
        .where('user_id', '=', userId)
        .execute(),
    ]);

    return {
      exportedAt: toIso(new Date()),
      notice:
        "Export des données personnelles détenues par Dorloter, au titre des articles 15 et 20 du RGPD.",
      compte: {
        ...user,
        created_at: toIso(user.created_at),
        updated_at: toIso(user.updated_at),
      },
      signalements: reports.map((r) => ({ ...r, created_at: toIso(r.created_at) })),
      candidatures: applications.map((a) => ({ ...a, created_at: toIso(a.created_at) })),
      favoris: favorites.map((f) => ({ ...f, created_at: toIso(f.created_at) })),
      conversations: conversations.map((c) => ({ ...c, created_at: toIso(c.created_at) })),
      messages: messages.map((m) => ({ ...m, created_at: toIso(m.created_at) })),
      notifications: notifications.map((n) => ({ ...n, created_at: toIso(n.created_at) })),
      reservations: bookings.map((b) => ({ ...b, created_at: toIso(b.created_at) })),
      avis: reviews.map((r) => ({ ...r, created_at: toIso(r.created_at) })),
      // `effective_date` et `end_date` sont des dates seules (`yyyy-mm-dd`),
      // déjà au bon format : elles passent telles quelles.
      contrats: contracts.map((c) => ({ ...c, created_at: toIso(c.created_at) })),
      refugesSuivis: follows.map((f) => ({ ...f, created_at: toIso(f.created_at) })),
    };
  }

  /**
   * Efface le compte et les données rattachées. Renvoie le chemin effectivement
   * emprunté, pour que l'appelant puisse l'expliquer à l'utilisateur.
   */
  async deleteAccount(userId: string): Promise<DeletionOutcome> {
    // Relevé AVANT la transaction : les photos de signalements partent en
    // cascade, et une fois les lignes supprimées plus rien ne permettrait de
    // retrouver les objets à effacer du stockage.
    const photos = await this.db
      .selectFrom('report_photos')
      .select('url')
      .where('report_id', 'in', (eb) =>
        eb.selectFrom('reports').select('id').where('user_id', '=', userId),
      )
      .execute();

    const outcome = await this.db.transaction().execute(async (trx) => {
      const contract = await trx
        .selectFrom('contracts')
        .select('id')
        .where('user_id', '=', userId)
        .executeTakeFirst();
      const followup = await trx
        .selectFrom('adoption_followups')
        .select('id')
        .where('user_id', '=', userId)
        .executeTakeFirst();
      const mustKeepRecords = Boolean(contract ?? followup);

      // Identifiants de connexion : partent dans tous les cas, immédiatement.
      await trx.deleteFrom('auth_refresh_tokens').where('user_id', '=', userId).execute();
      await trx.deleteFrom('accounts').where('user_id', '=', userId).execute();

      if (!mustKeepRecords) {
        // Les cascades font le reste (signalements, candidatures, favoris,
        // conversations, notifications, réservations, avis, appartenances…).
        await trx.deleteFrom('users').where('id', '=', userId).execute();
        this.logger.log(`compte ${userId} supprimé`);
        return 'supprime';
      }

      // Chemin anonymisation : on retire explicitement ce que la cascade aurait
      // emporté, puisque la ligne `users` doit survivre pour porter le contrat.
      await trx.deleteFrom('reports').where('user_id', '=', userId).execute();
      await trx.deleteFrom('applications').where('user_id', '=', userId).execute();
      await trx.deleteFrom('favorites').where('user_id', '=', userId).execute();
      await trx.deleteFrom('conversations').where('user_id', '=', userId).execute();
      await trx.deleteFrom('notifications').where('user_id', '=', userId).execute();
      await trx.deleteFrom('device_tokens').where('user_id', '=', userId).execute();
      await trx.deleteFrom('pension_bookings').where('user_id', '=', userId).execute();
      await trx.deleteFrom('pension_reviews').where('user_id', '=', userId).execute();
      await trx.deleteFrom('shelter_follows').where('user_id', '=', userId).execute();
      await trx.deleteFrom('shelter_members').where('user_id', '=', userId).execute();
      await trx.deleteFrom('foster_families').where('user_id', '=', userId).execute();
      await trx.deleteFrom('resolution_credits').where('user_id', '=', userId).execute();

      await trx
        .updateTable('users')
        .set({
          email: `supprime+${userId}@${ANONYMISED_EMAIL_DOMAIN}`,
          name: 'Compte supprimé',
          image: null,
          phone: null,
          bio: null,
          city: null,
          is_public: false,
          digest_optin: false,
          email_verified: false,
          shelter_id: null,
          pension_id: null,
          location: null,
          updated_at: new Date(),
        })
        .where('id', '=', userId)
        .execute();

      this.logger.log(`compte ${userId} anonymisé (contrat ou suivi conservé)`);
      return 'anonymise';
    });

    // Effacement du stockage une fois la base à jour. Best-effort : un objet
    // orphelin ne doit pas transformer une suppression réussie en erreur.
    for (const photo of photos) {
      const key = this.s3.keyFromPublicUrl(photo.url);
      if (key) await this.s3.deleteObject(key);
    }

    return outcome;
  }
}
