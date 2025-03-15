import { db } from "@infra/db";
import { adoptionFollowups } from "@/server/db/schema";

const STAGE_OFFSETS_DAYS = {
  j15: 15,
  j90: 90,
  j365: 365,
} as const;

interface ScheduleParams {
  applicationId: string;
  userId: string;
  petId: string;
  shelterId: string;
  /** Date d'acceptation. Par défaut maintenant. */
  acceptedAt?: Date;
}

/**
 * Programme les trois followups (J+15, J+90, J+365) liés à une adoption
 * acceptée. Idempotent grâce à l'unique index (application_id, stage) :
 * un second appel pour la même candidature n'insère rien.
 */
export async function scheduleAdoptionFollowups(
  params: ScheduleParams
): Promise<void> {
  const { applicationId, userId, petId, shelterId } = params;
  const base = params.acceptedAt ?? new Date();

  const rows = (Object.keys(STAGE_OFFSETS_DAYS) as Array<
    keyof typeof STAGE_OFFSETS_DAYS
  >).map((stage) => {
    const due = new Date(base);
    due.setDate(due.getDate() + STAGE_OFFSETS_DAYS[stage]);
    return {
      applicationId,
      userId,
      petId,
      shelterId,
      stage,
      status: "pending" as const,
      dueAt: due,
    };
  });

  await db
    .insert(adoptionFollowups)
    .values(rows)
    .onConflictDoNothing({
      target: [adoptionFollowups.applicationId, adoptionFollowups.stage],
    });
}
