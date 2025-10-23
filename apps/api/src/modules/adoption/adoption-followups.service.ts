/**
 * Back-office refuge : suivi post-adoption. À la signature d'un contrat
 * d'adoption, trois relances sont créées (J+7, J+30, J+90). Le refuge les traite
 * depuis son back-office et les coche. Aucun planificateur : les échéances dues
 * sont remontées par requête. Permissions `Applications*`.
 */

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { AppError } from '../../shared/app-error';
import { toIso, toIsoOrNull } from '../../shared/format';
import { ShelterMembershipService } from '../shelters/shelter-membership.service';

/** Échéances (en jours après la signature) des relances post-adoption. */
const FOLLOWUP_SCHEDULE: readonly { days: number; label: string }[] = [
  { days: 7, label: 'Nouvelles à 1 semaine' },
  { days: 30, label: 'Nouvelles à 1 mois' },
  { days: 90, label: 'Nouvelles à 3 mois' },
];

export interface FollowupDto {
  id: string;
  contractId: string;
  contractReference: string;
  petId: string | null;
  petName: string | null;
  species: string | null;
  userId: string;
  adopterName: string | null;
  adopterEmail: string | null;
  adopterPhone: string | null;
  label: string;
  dueDate: string;
  status: string;
  overdue: boolean;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AdoptionFollowupsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
  ) {}

  /**
   * Crée les relances de suivi d'un contrat d'adoption signé. Idempotent : ne
   * recrée rien si des relances existent déjà pour ce contrat.
   */
  async createForContract(
    contractId: string,
    shelterId: string,
    petId: string | null,
    userId: string,
    from: Date,
  ): Promise<void> {
    const existing = await this.db
      .selectFrom('adoption_followups')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('contract_id', '=', contractId)
      .executeTakeFirstOrThrow();
    if (existing.count > 0) return;

    await this.db
      .insertInto('adoption_followups')
      .values(
        FOLLOWUP_SCHEDULE.map((step) => ({
          contract_id: contractId,
          shelter_id: shelterId,
          pet_id: petId,
          user_id: userId,
          label: step.label,
          due_date: addDays(from, step.days),
        })),
      )
      .execute();
  }

  async list(userId: string): Promise<FollowupDto[]> {
    const shelterId = await this.membership.requireAccess(userId, 'applications:read');
    // À faire d'abord (les plus en retard en tête), puis l'historique fait.
    const rows = await this.baseQuery()
      .where('af.shelter_id', '=', shelterId)
      .where('af.status', '<>', 'annule')
      .orderBy(sql`CASE af.status WHEN 'a_faire' THEN 0 ELSE 1 END`)
      .orderBy('af.due_date', 'asc')
      .orderBy('af.completed_at', 'desc')
      .execute();
    return rows.map(toDto);
  }

  async complete(userId: string, id: string, notes: string | null): Promise<FollowupDto> {
    await this.requireWritable(userId, id);
    await this.db
      .updateTable('adoption_followups')
      .set((eb) => ({
        status: 'fait',
        completed_at: new Date(),
        notes: notes ?? eb.ref('notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .execute();
    return this.fetchOne(id);
  }

  async cancel(userId: string, id: string): Promise<void> {
    await this.requireWritable(userId, id);
    await this.db
      .updateTable('adoption_followups')
      .set({ status: 'annule', updated_at: new Date() })
      .where('id', '=', id)
      .execute();
  }

  async reopen(userId: string, id: string): Promise<FollowupDto> {
    await this.requireWritable(userId, id);
    await this.db
      .updateTable('adoption_followups')
      .set({ status: 'a_faire', completed_at: null, updated_at: new Date() })
      .where('id', '=', id)
      .execute();
    return this.fetchOne(id);
  }

  // --- Internes --------------------------------------------------------------------

  private baseQuery() {
    return this.db
      .selectFrom('adoption_followups as af')
      .innerJoin('contracts as c', 'c.id', 'af.contract_id')
      .innerJoin('users as u', 'u.id', 'af.user_id')
      .leftJoin('pets as p', 'p.id', 'af.pet_id')
      .select([
        'af.id',
        'af.contract_id',
        'c.reference as contract_reference',
        'af.pet_id',
        'p.name as pet_name',
        'p.species',
        'af.user_id',
        'u.name as adopter_name',
        'u.email as adopter_email',
        'u.phone as adopter_phone',
        'af.label',
        'af.due_date',
        'af.status',
        sql<boolean>`(af.status = 'a_faire' AND af.due_date < CURRENT_DATE)`.as('overdue'),
        'af.notes',
        'af.completed_at',
        'af.created_at',
        'af.updated_at',
      ]);
  }

  private async fetchOne(id: string): Promise<FollowupDto> {
    const row = await this.baseQuery().where('af.id', '=', id).executeTakeFirstOrThrow();
    return toDto(row);
  }

  /** Charge une relance appartenant au refuge de l'utilisateur (permission écriture). */
  private async requireWritable(userId: string, id: string): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, 'applications:write');
    const row = await this.db
      .selectFrom('adoption_followups')
      .select('shelter_id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) throw AppError.notFoundId('Relance', id);
    if (row.shelter_id !== shelterId) {
      throw AppError.forbidden('Cette relance ne concerne pas votre refuge.');
    }
  }
}

interface FollowupRow {
  id: string;
  contract_id: string;
  contract_reference: string;
  pet_id: string | null;
  pet_name: string | null;
  species: string | null;
  user_id: string;
  adopter_name: string | null;
  adopter_email: string | null;
  adopter_phone: string | null;
  label: string;
  due_date: string;
  status: string;
  overdue: boolean;
  notes: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toDto(row: FollowupRow): FollowupDto {
  return {
    id: row.id,
    contractId: row.contract_id,
    contractReference: row.contract_reference,
    petId: row.pet_id,
    petName: row.pet_name,
    species: row.species,
    userId: row.user_id,
    adopterName: row.adopter_name,
    adopterEmail: row.adopter_email,
    adopterPhone: row.adopter_phone,
    label: row.label,
    dueDate: row.due_date,
    status: row.status,
    overdue: row.overdue,
    notes: row.notes,
    completedAt: toIsoOrNull(row.completed_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** Ajoute `days` jours à une date et renvoie la date civile `yyyy-mm-dd`. */
function addDays(from: Date, days: number): string {
  const date = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + days),
  );
  return date.toISOString().slice(0, 10);
}
