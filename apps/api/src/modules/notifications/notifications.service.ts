/**
 * Centre de notifications in-app (persistées). `publish` est l'API réutilisable
 * par les autres modules (matching, candidatures, digest...).
 */

import { Inject, Injectable } from '@nestjs/common';

import { DB, type Db } from '../../infra/database/database.module';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Publie une notification à un utilisateur. Renvoie l'id créé. */
  async publish(
    userId: string,
    type: string,
    title: string,
    body: string | null,
    data: unknown = null,
  ): Promise<string> {
    const row = await this.db
      .insertInto('notifications')
      .values({ user_id: userId, type, title, body, data, is_read: false })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  }
}
