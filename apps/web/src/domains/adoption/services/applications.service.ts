/**
 * Service applications — création + annulation de candidatures.
 *
 * Voir docs/SERVICES-API.md pour la convention.
 *
 * Le rate-limit est appliqué par la couche appelante (Server Action ou
 * route API via withApi). Le service se concentre sur :
 *   - cohérence métier (pet existe, statut disponible, doublon actif)
 *   - persistance + retour du nouvel ID
 *
 * Les events / revalidatePath restent côté caller.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import {
  conflict,
  notFound,
  unprocessable,
  validationFailed,
} from "@infra/api/errors";
import { applications, pets } from "@/server/db/schema";
import type { ApplicationFormData } from "../validation-application";

export interface CreateApplicationResult {
  id: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Crée une candidature pour `userId` sur `data.petId`. Throws en cas de :
 *   - 404 NOT_FOUND : pet inexistant
 *   - 422 UNPROCESSABLE : pet non disponible (réservé/adopté/retiré)
 *   - 409 CONFLICT : candidature existante du même user pour ce pet
 */
export async function createApplication(
  userId: string,
  data: ApplicationFormData
): Promise<CreateApplicationResult> {
  if (!UUID_RE.test(data.petId)) {
    throw validationFailed("ID animal invalide.");
  }

  const [pet] = await db
    .select({ status: pets.status })
    .from(pets)
    .where(eq(pets.id, data.petId))
    .limit(1);

  if (!pet) {
    throw notFound("Animal", data.petId);
  }
  if (pet.status !== "disponible") {
    throw unprocessable("Cet animal n'est plus disponible à l'adoption.");
  }

  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(eq(applications.petId, data.petId), eq(applications.userId, userId))
    )
    .limit(1);

  if (existing) {
    throw conflict("Vous avez déjà candidaté pour cet animal.", {
      applicationId: existing.id,
    });
  }

  const [inserted] = await db
    .insert(applications)
    .values({
      petId: data.petId,
      userId,
      housingType: data.housingType,
      hasOutdoorAccess: data.hasOutdoorAccess,
      hasOtherPets: data.hasOtherPets,
      hasChildren: data.hasChildren,
      childrenAges: data.childrenAges,
      experience: data.experience,
      motivation: data.motivation,
      availability: data.availability,
    })
    .returning({ id: applications.id });

  return { id: inserted!.id };
}

/**
 * Annule une candidature appartenant à `userId`. Throws si :
 *   - 404 NOT_FOUND : id inexistant ou n'appartenant pas à l'user
 *   - 422 UNPROCESSABLE : déjà acceptée ou refusée
 */
export async function cancelApplication(
  userId: string,
  applicationId: string
): Promise<void> {
  if (!UUID_RE.test(applicationId)) {
    throw validationFailed("ID candidature invalide.");
  }

  const [existing] = await db
    .select({ userId: applications.userId, status: applications.status })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!existing || existing.userId !== userId) {
    throw notFound("Candidature", applicationId);
  }

  if (existing.status === "acceptee" || existing.status === "refusee") {
    throw unprocessable(
      "Cette candidature ne peut plus être annulée · décision déjà prise par le refuge."
    );
  }

  await db
    .update(applications)
    .set({ status: "annulee", updatedAt: new Date() })
    .where(eq(applications.id, applicationId));
}
