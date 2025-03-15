import { NextResponse } from "next/server";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@infra/db";
import {
  adoptionFollowups,
  pets,
  shelters,
  users,
} from "@/server/db/schema";
import {
  sendEmail,
  followupJ15EmailTemplate,
  followupJ90EmailTemplate,
  followupJ365EmailTemplate,
} from "@infra/email";
import { checkCronAuth } from "@infra/cron/auth";

/**
 * Cron quotidien : envoie les emails de suivi post-adoption arrivés à
 * échéance (J+15, J+90, J+365 après acceptation candidature). Chaque
 * ligne `pending` avec `due_at <= now()` est traitée puis marquée `sent`
 * (ou `skipped` si l'envoi échoue).
 *
 * Exemple Vercel Cron (vercel.json) :
 *   { "path": "/api/cron/send-adoption-followups", "schedule": "0 9 * * *" }
 *   → tous les jours à 9h Paris
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const now = new Date();

  // On joint user (email/nom adoptant), pet (nom), shelter (nom + email
  // contact). Limit 200 par run pour borner la durée du cron.
  const due = await db
    .select({
      followupId: adoptionFollowups.id,
      stage: adoptionFollowups.stage,
      petName: pets.name,
      petId: pets.id,
      shelterName: shelters.name,
      shelterEmail: shelters.email,
      userName: users.name,
      userEmail: users.email,
    })
    .from(adoptionFollowups)
    .innerJoin(users, eq(users.id, adoptionFollowups.userId))
    .innerJoin(pets, eq(pets.id, adoptionFollowups.petId))
    .innerJoin(shelters, eq(shelters.id, adoptionFollowups.shelterId))
    .where(
      and(
        eq(adoptionFollowups.status, "pending"),
        lte(adoptionFollowups.dueAt, now)
      )
    )
    .limit(200);

  if (due.length === 0) {
    return NextResponse.json({
      processed: 0,
      at: now.toISOString(),
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of due) {
    let tpl;
    if (row.stage === "j15") {
      tpl = followupJ15EmailTemplate({
        userName: row.userName,
        petName: row.petName,
        shelterName: row.shelterName,
        shelterEmail: row.shelterEmail,
      });
    } else if (row.stage === "j90") {
      tpl = followupJ90EmailTemplate({
        userName: row.userName,
        petName: row.petName,
        petId: row.petId,
      });
    } else {
      tpl = followupJ365EmailTemplate({
        userName: row.userName,
        petName: row.petName,
        shelterName: row.shelterName,
      });
    }

    try {
      const result = await sendEmail({ to: row.userEmail, ...tpl });
      if (result.success) {
        await db
          .update(adoptionFollowups)
          .set({
            status: "sent",
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(adoptionFollowups.id, row.followupId));
        sent += 1;
      } else {
        await db
          .update(adoptionFollowups)
          .set({ status: "skipped", updatedAt: new Date() })
          .where(eq(adoptionFollowups.id, row.followupId));
        skipped += 1;
        errors.push(`${row.userEmail}: ${result.error ?? "envoi échoué"}`);
      }
    } catch (err) {
      await db
        .update(adoptionFollowups)
        .set({ status: "skipped", updatedAt: new Date() })
        .where(eq(adoptionFollowups.id, row.followupId));
      skipped += 1;
      errors.push(
        `${row.userEmail}: ${err instanceof Error ? err.message : "erreur"}`
      );
    }
  }

  return NextResponse.json({
    processed: due.length,
    sent,
    skipped,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    at: now.toISOString(),
  });
}
