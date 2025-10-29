/**
 * Appartenance d'un compte à l'équipe d'un refuge + autorisation par permission.
 *
 * API publique du module Shelters utilisée par les back-offices (adoption,
 * messagerie, bénévolat...). L'autorisation refuge passe TOUJOURS par une
 * permission de membre, jamais par le rôle JWT : un membre invité a `role=user`
 * mais des permissions d'équipe.
 */

import { Inject, Injectable } from '@nestjs/common';

import { DB, type Db } from '../../infra/database/database.module';
import { AppError } from '../../shared/app-error';
import { toIso } from '../../shared/format';
import { UserDirectory } from '../identity/identity.directory';
import {
  parseMemberRole,
  roleHasPermission,
  ShelterMemberRole,
  type ShelterPermission,
} from './shelter-permission';

interface MemberRow {
  id: string;
  shelter_id: string;
  user_id: string;
  role: string;
  status: string;
  invited_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Vue d'un membre enrichie de l'identité résolue (nom, email). */
export interface MemberView {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
}

const MEMBER_COLUMNS = [
  'id',
  'shelter_id',
  'user_id',
  'role',
  'status',
  'invited_by',
  'created_at',
  'updated_at',
] as const;

@Injectable()
export class ShelterMembershipService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UserDirectory,
  ) {}

  /** Résout le refuge de l'utilisateur en exigeant une permission. 403 sinon. */
  async requireAccess(userId: string, permission: ShelterPermission): Promise<string> {
    const memberships = await this.activeMemberships(userId);
    if (memberships.length === 0) {
      throw AppError.forbidden('Accès à un espace refuge requis.');
    }
    const granted = memberships.find((member) => {
      const role = parseMemberRole(member.role);
      return role !== null && roleHasPermission(role, permission);
    });
    if (!granted) throw AppError.forbidden('Permission insuffisante pour cette action.');
    return granted.shelter_id;
  }

  /** Premier refuge dont l'utilisateur est membre actif (cas courant : un seul). */
  async primaryShelterOf(userId: string): Promise<string | null> {
    const memberships = await this.activeMemberships(userId);
    return memberships[0]?.shelter_id ?? null;
  }

  async listMembers(actingUserId: string): Promise<MemberView[]> {
    const shelterId = await this.primaryShelterOf(actingUserId);
    if (shelterId === null) throw AppError.forbidden('Accès à un espace refuge requis.');

    const members = await this.db
      .selectFrom('shelter_members')
      .select(MEMBER_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .orderBy('created_at')
      .execute();

    const refs = await this.users.findRefsById(members.map((m) => m.user_id));
    return members.map((member) => toView(member, refs.get(member.user_id) ?? null));
  }

  async invite(actingUserId: string, email: string, roleValue: string): Promise<MemberView> {
    const shelterId = await this.requireAccess(actingUserId, 'members:manage');
    const role = requireRole(roleValue);

    const targetUserId = await this.users.userIdByEmail(email);
    if (targetUserId === null) {
      throw AppError.unprocessable(
        "Aucun compte Dorloter avec cet email. Demandez à la personne de créer un compte d'abord.",
      );
    }

    const existing = await this.db
      .selectFrom('shelter_members')
      .select('id')
      .where('shelter_id', '=', shelterId)
      .where('user_id', '=', targetUserId)
      .executeTakeFirst();
    if (existing) throw AppError.conflict("Ce compte fait déjà partie de l'équipe.");

    const member = await this.db
      .insertInto('shelter_members')
      .values({
        shelter_id: shelterId,
        user_id: targetUserId,
        role,
        status: 'active',
        invited_by: actingUserId,
      })
      .returning(MEMBER_COLUMNS)
      .executeTakeFirstOrThrow();

    await this.users.markShelterAdmin(targetUserId);
    return toView(member, await this.users.findRef(targetUserId));
  }

  async updateRole(
    actingUserId: string,
    memberId: string,
    roleValue: string,
  ): Promise<MemberView> {
    const shelterId = await this.requireAccess(actingUserId, 'members:manage');
    const role = requireRole(roleValue);
    const member = await this.ownedMember(shelterId, memberId);

    if (
      member.role === ShelterMemberRole.Owner &&
      role !== ShelterMemberRole.Owner &&
      (await this.isLastOwner(shelterId))
    ) {
      throw AppError.conflict('Impossible de rétrograder le dernier responsable du refuge.');
    }

    const updated = await this.db
      .updateTable('shelter_members')
      .set({ role, updated_at: new Date() })
      .where('id', '=', member.id)
      .returning(MEMBER_COLUMNS)
      .executeTakeFirstOrThrow();

    return toView(updated, await this.users.findRef(updated.user_id));
  }

  async remove(actingUserId: string, memberId: string): Promise<void> {
    const shelterId = await this.requireAccess(actingUserId, 'members:manage');
    const member = await this.ownedMember(shelterId, memberId);
    if (member.role === ShelterMemberRole.Owner && (await this.isLastOwner(shelterId))) {
      throw AppError.conflict('Impossible de retirer le dernier responsable du refuge.');
    }
    await this.db.deleteFrom('shelter_members').where('id', '=', member.id).execute();
  }

  // --- Internes ------------------------------------------------------------------

  private async activeMemberships(userId: string): Promise<MemberRow[]> {
    return this.db
      .selectFrom('shelter_members')
      .select(MEMBER_COLUMNS)
      .where('user_id', '=', userId)
      .where('status', '=', 'active')
      .execute();
  }

  private async isLastOwner(shelterId: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('shelter_members')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('shelter_id', '=', shelterId)
      .where('role', '=', ShelterMemberRole.Owner)
      .executeTakeFirstOrThrow();
    return row.count <= 1;
  }

  private async ownedMember(shelterId: string, memberId: string): Promise<MemberRow> {
    const member = await this.db
      .selectFrom('shelter_members')
      .select(MEMBER_COLUMNS)
      .where('id', '=', memberId)
      .executeTakeFirst();
    if (!member) throw AppError.notFoundId('Membre', memberId);
    if (member.shelter_id !== shelterId) {
      throw AppError.forbidden("Ce membre n'appartient pas à votre refuge.");
    }
    return member;
  }
}

function requireRole(value: string): ShelterMemberRole {
  const role = parseMemberRole(value);
  if (role === null) throw AppError.unprocessable(`Rôle invalide : ${value}`);
  return role;
}

function toView(member: MemberRow, ref: { name: string; email: string } | null): MemberView {
  return {
    id: member.id,
    userId: member.user_id,
    name: ref?.name ?? null,
    email: ref?.email ?? null,
    role: member.role,
    status: member.status,
    createdAt: toIso(member.created_at),
  };
}
