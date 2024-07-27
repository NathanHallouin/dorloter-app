import { NextResponse } from "next/server";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { applications, shelters, users, pets } from "@/server/db/schema";
import { sendEmail } from "@infra/email";
import { checkCronAuth } from "@infra/cron/auth";

/**
 * Envoie un email de rappel aux admins des refuges qui ont des candidatures
 * d'adoption en attente (status `envoyee` ou `en_cours`) depuis plus de 7
 * jours. Un email par refuge, agrégeant le nombre total de candidatures en
 * attente.
 *
 * Note : sans colonne `last_reminder_sent_at` sur applications, le même
 * refuge peut recevoir l'email plusieurs fois si le cron tourne souvent.
 * Recommandation : lancer CE cron **une fois par semaine** (pas quotidien)
 * pour éviter de spammer.
 *
 * Exemple Vercel Cron (vercel.json) :
 *   { "path": "/api/cron/remind-pending-applications", "schedule": "0 9 * * 1" }
 *   → chaque lundi à 9h
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Grouper par refuge : compter les candidatures pending > 7j
  const rows = await db
    .select({
      shelterId: pets.shelterId,
      shelterName: shelters.name,
      count: sql<number>`count(*)::int`,
      oldestAt: sql<Date>`min(${applications.createdAt})`,
    })
    .from(applications)
    .innerJoin(pets, eq(pets.id, applications.petId))
    .innerJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(
      and(
        inArray(applications.status, ["envoyee", "en_cours"]),
        lt(applications.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(pets.shelterId, shelters.name);

  if (rows.length === 0) {
    return NextResponse.json({
      shelters: 0,
      emailsSent: 0,
      at: new Date().toISOString(),
    });
  }

  // Admins de chaque refuge concerné
  const shelterIds = rows.map((r) => r.shelterId);
  const admins = await db
    .select({
      shelterId: users.shelterId,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "shelter_admin"),
        inArray(users.shelterId, shelterIds)
      )
    );

  const adminsByShelter = new Map<string, { email: string; name: string }[]>();
  for (const a of admins) {
    if (!a.shelterId) continue;
    const list = adminsByShelter.get(a.shelterId) ?? [];
    list.push({ email: a.email, name: a.name });
    adminsByShelter.set(a.shelterId, list);
  }

  let emailsSent = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const recipients = adminsByShelter.get(row.shelterId);
    if (!recipients || recipients.length === 0) continue;

    const oldestDays = Math.floor(
      (Date.now() - new Date(row.oldestAt).getTime()) / (24 * 60 * 60 * 1000)
    );
    const tpl = pendingApplicationsTemplate({
      shelterName: row.shelterName,
      count: row.count,
      oldestDays,
    });

    for (const r of recipients) {
      try {
        await sendEmail({ to: r.email, ...tpl });
        emailsSent += 1;
      } catch (err) {
        errors.push(
          `${r.email}: ${err instanceof Error ? err.message : "erreur"}`
        );
      }
    }
  }

  return NextResponse.json({
    shelters: rows.length,
    emailsSent,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    at: new Date().toISOString(),
  });
}

function pendingApplicationsTemplate(params: {
  shelterName: string;
  count: number;
  oldestDays: number;
}) {
  const { shelterName, count, oldestDays } = params;
  const plural = count > 1;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

  const subject = plural
    ? `${count} candidatures en attente chez ${shelterName}`
    : `Une candidature en attente chez ${shelterName}`;

  const text = [
    `Bonjour,`,
    ``,
    `${count} candidature${plural ? "s" : ""} d'adoption ${plural ? "attendent" : "attend"} votre réponse chez ${shelterName}.`,
    `La plus ancienne a été envoyée il y a ${oldestDays} jours.`,
    ``,
    `Chaque jour de délai peut décourager un adoptant motivé. Prenez quelques minutes pour les traiter :`,
    `${appUrl}/shelter-candidatures`,
    ``,
    `Merci pour votre engagement,`,
    `L'équipe Dorloter`,
  ].join("\n");

  const html = `
<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #e8634d;">Candidatures en attente</h1>
  <p>Bonjour,</p>
  <p><strong>${count}</strong> candidature${plural ? "s" : ""} d'adoption ${plural ? "attendent" : "attend"} votre réponse chez <strong>${shelterName}</strong>.</p>
  <p>La plus ancienne a été envoyée il y a <strong>${oldestDays} jours</strong>.</p>
  <p>Chaque jour de délai peut décourager un adoptant motivé.</p>
  <p style="margin: 24px 0;">
    <a href="${appUrl}/shelter-candidatures"
       style="background: #e8634d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Voir les candidatures
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">Merci pour votre engagement,<br>L'équipe Dorloter</p>
</div>`;

  return { subject, html, text };
}
