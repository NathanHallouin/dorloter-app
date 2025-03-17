import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";
import { checkCronAuth } from "@infra/cron/auth";
import { sendEmail, weeklyDigestEmailTemplate } from "@infra/email";
import { sendPush, type PushSubscriptionJSON } from "@infra/push/web-push";
import { buildWeeklyDigestRecipients } from "@adoption/public";

/**
 * Cron hebdomadaire « Nouveautés dans votre rayon ».
 *
 * Pour chaque utilisateur géolocalisé, sélectionne jusqu'à 3 pets
 * récemment publiés (status `disponible`, créés depuis 7 jours) dans
 * son rayon (`notification_radius_km`), filtrés par les espèces de
 * ses recherches sauvegardées d'adoption actives.
 *
 * Envoi email + push (best-effort). Subscription expirée (404/410)
 * purgée automatiquement.
 *
 * Vercel Cron (vercel.json) :
 *   { "path": "/api/cron/send-weekly-pet-digest", "schedule": "0 9 * * 1" }
 *   → tous les lundis 9h Paris
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const now = new Date();

  const recipients = await buildWeeklyDigestRecipients({
    sinceDays: 7,
    perUserLimit: 3,
  });

  let emailsSent = 0;
  let pushesSent = 0;
  let purgedSubs = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    // Email
    try {
      const tpl = weeklyDigestEmailTemplate({
        userName: r.name,
        pets: r.pets.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          photoUrl: p.primaryPhotoUrl,
          shelterName: p.shelterName,
          distanceKm: p.distanceKm,
        })),
      });
      const result = await sendEmail({ to: r.email, ...tpl });
      if (result.success) emailsSent += 1;
      else errors.push(`${r.email} (email): ${result.error}`);
    } catch (err) {
      errors.push(
        `${r.email} (email): ${err instanceof Error ? err.message : "erreur"}`
      );
    }

    // Push
    if (r.pushSubscription) {
      try {
        const first = r.pets[0];
        if (!first) continue;
        const speciesNoun =
          r.pets.length > 1 ? "nouveaux animaux" : "nouvel animal";
        const payload = {
          title:
            r.pets.length > 1
              ? `${r.pets.length} ${speciesNoun} à adopter près de chez vous`
              : `${first.name} cherche un foyer près de chez vous`,
          body:
            r.pets.length > 1
              ? r.pets.map((p) => p.name).join(", ")
              : `${first.shelterName} · à ${first.distanceKm.toFixed(1)} km`,
          tag: "weekly-pet-digest",
          data: { url: "/adopter" },
        };
        const push = await sendPush(
          r.pushSubscription as PushSubscriptionJSON,
          payload
        );
        if (push.ok) {
          pushesSent += 1;
        } else if (push.gone) {
          purgedSubs += 1;
          await db
            .update(users)
            .set({ pushSubscription: sql`NULL` })
            .where(eq(users.id, r.userId));
        } else if (push.error) {
          errors.push(`${r.email} (push): ${push.error}`);
        }
      } catch (err) {
        errors.push(
          `${r.email} (push): ${err instanceof Error ? err.message : "erreur"}`
        );
      }
    }
  }

  return NextResponse.json({
    recipients: recipients.length,
    emailsSent,
    pushesSent,
    purgedSubs,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    at: now.toISOString(),
  });
}
