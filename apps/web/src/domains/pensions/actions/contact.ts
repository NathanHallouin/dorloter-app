"use server";

import { db } from "@infra/db";
import { pensions, pensionContactEvents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@infra/auth/session";
import { consumeRateLimit } from "@infra/rate-limit";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

type ContactAction = "call" | "email" | "website";

const ACTIONS: ContactAction[] = ["call", "email", "website"];

/**
 * Trace une action de contact (appel / email / visite du site) initiée
 * depuis la fiche d'une pension. Sert de :
 *   - signal d'engagement pour la pension elle-même (compteur public),
 *   - garde-fou pour la vérification des avis (un user ne peut laisser un
 *     avis "vérifié" que s'il a un événement de contact dans les 90 jours).
 *
 * On ne stocke jamais le contenu du contact (ni numéro composé, ni
 * payload de l'email), uniquement (pension, user, action, timestamp).
 *
 * Anti-spam : 30 contacts par IP / heure max.
 */
export async function recordPensionContact(
  pensionId: string,
  action: ContactAction
): Promise<ActionResponse> {
  if (!ACTIONS.includes(action)) {
    return { success: false, error: "Action inconnue." };
  }

  const rate = await consumeRateLimit({
    key: "pension:contact",
    limit: 30,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: "Trop de contacts récents. Réessayez plus tard.",
    };
  }

  // On vérifie que la pension existe et est publiée — pas la peine de
  // tracer des contacts sur des fiches admin/non vérifiées.
  const [pension] = await db
    .select({ isVerified: pensions.isVerified })
    .from(pensions)
    .where(eq(pensions.id, pensionId))
    .limit(1);

  if (!pension || !pension.isVerified) {
    return { success: false, error: "Pension introuvable." };
  }

  const session = await getCurrentSession();
  await db.insert(pensionContactEvents).values({
    pensionId,
    userId: session?.user.id ?? null,
    action,
  });

  logEvent(
    "pension.contact",
    { pensionId, action },
    { userId: session?.user.id }
  );

  return { success: true };
}
