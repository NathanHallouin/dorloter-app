/**
 * API publique du module Identity pour les autres bounded contexts : résoudre un
 * utilisateur (référence légère, email) sans exposer l'entité complète.
 */

import { Inject, Injectable } from '@nestjs/common';

import { DB, type Db } from '../../infra/database/database.module';

/** Référence publique légère d'un utilisateur. */
export interface UserRef {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

@Injectable()
export class UserDirectory {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findRef(userId: string): Promise<UserRef | null> {
    const row = await this.db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'phone'])
      .where('id', '=', userId)
      .executeTakeFirst();
    return row ?? null;
  }

  /** Réfs publiques de plusieurs utilisateurs en une requête (évite le N+1). */
  async findRefs(userIds: string[]): Promise<UserRef[]> {
    if (userIds.length === 0) return [];
    return this.db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'phone'])
      .where('id', 'in', userIds)
      .execute();
  }

  /** Réfs indexées par id (usage courant : enrichir une liste). */
  async findRefsById(userIds: string[]): Promise<Map<string, UserRef>> {
    const refs = await this.findRefs(userIds);
    return new Map(refs.map((ref) => [ref.id, ref]));
  }

  /** Pension administrée par cet utilisateur, s'il est `pension_admin`. */
  async pensionIdOf(userId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('users')
      .select('pension_id')
      .where('id', '=', userId)
      .where('role', '=', 'pension_admin')
      .executeTakeFirst();
    return row?.pension_id ?? null;
  }

  async userIdByEmail(email: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('users')
      .select('id')
      .where((eb) => eb(eb.fn('lower', ['email']), '=', email.toLowerCase()))
      .executeTakeFirst();
    return row?.id ?? null;
  }

  /** Promeut un compte `user` en `shelter_admin` (accès aux espaces refuge). */
  async markShelterAdmin(userId: string): Promise<void> {
    await this.db
      .updateTable('users')
      .set({ role: 'shelter_admin', updated_at: new Date() })
      .where('id', '=', userId)
      .where('role', '=', 'user')
      .execute();
  }
}
