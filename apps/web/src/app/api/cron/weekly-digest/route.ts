import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@infra/db";
import { sendEmail, weeklyDigestEmailTemplate } from "@infra/email";
import { sendPush } from "@infra/push/web-push";
import type { PushSubscriptionJSON } from "@infra/push/web-push";
import { checkCronAuth } from "@infra/cron/auth";
import { logEvent } from "@infra/logger";

/**
 * Digest hebdomadaire : pour chaque user avec une localisation, agrège les
 * chats disponibles créés dans les 7 derniers jours dans son rayon de
 * notification, et lui envoie un email + push si au moins 3 nouveautés.
 *
 * Seuil de 3 pour éviter d'envoyer un email pour 1 seul chat (déjà couvert
 * par la notif `new_cat_nearby` au moment de la publication) et garder le
 * digest "digestif".
 *
 * Sans idempotency en base — compte sur le cron pour tourner 1× par
 * semaine. Si lancé deux fois, les users reçoivent deux emails.
 *
 * Fréquence recommandée : lundi matin (08h par exemple).
 * Vercel Cron / crontab :
 *   0 8 * * 1  curl "https://dorloter.fr/api/cron/weekly-digest?token=$CRON_SECRET"
 */

const MIN_NEW_CATS = 3;
const DEFAULT_RADIUS_KM = 10;

interface DigestRow {
  userId: string;
  userName: string;
  userEmail: string;
  pushSubscription: PushSubscriptionJSON | null;
  radiusKm: number;
  pets: Array<{
    id: string;
    name: string;
    photoUrl: string | null;
    shelterName: string | null;
    distanceKm: number;
  }>;
}

export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const now = new Date();

  // Requête agrégée : pour chaque user géolocalisé, les chats nouveaux dans
  // son rayon. On utilise ST_DWithin + json_agg pour ne pas exploser les
  // round-trips. On trie les chats par distance croissante et on limite à 5
  // côté application pour garder la requête simple.
  //
  // Intervalle Postgres `now() - interval '7 days'` plutôt qu'un Date JS
  // bindé : évite un bug postgres-js qui passe un objet Date en bytes bruts.
  const rows = (await db.execute(sql`
    WITH candidates AS (
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.push_subscription AS push_subscription,
        COALESCE(u.notification_radius_km, ${DEFAULT_RADIUS_KM}) AS radius_km,
        c.id AS cat_id,
        c.name AS cat_name,
        s.name AS shelter_name,
        (
          SELECT url FROM cat_photos
          WHERE cat_id = c.id AND is_primary = true LIMIT 1
        ) AS photo_url,
        ST_Distance(
          u.location::geography,
          s.location::geography
        ) AS distance_meters
      FROM users u
      JOIN pets c ON c.status = 'disponible'
        AND c.created_at >= now() - interval '7 days'
      JOIN shelters s ON s.id = c.shelter_id
      WHERE u.location IS NOT NULL
        AND s.location IS NOT NULL
        AND ST_DWithin(
          u.location::geography,
          s.location::geography,
          COALESCE(u.notification_radius_km, ${DEFAULT_RADIUS_KM}) * 1000
        )
    )
    SELECT
      user_id,
      user_name,
      user_email,
      push_subscription,
      radius_km,
      json_agg(
        json_build_object(
          'id', cat_id,
          'name', cat_name,
          'photoUrl', photo_url,
          'shelterName', shelter_name,
          'distanceKm', round((distance_meters / 1000.0)::numeric, 2)
        )
        ORDER BY distance_meters ASC
      ) FILTER (WHERE cat_id IS NOT NULL) AS pets
    FROM candidates
    GROUP BY user_id, user_name, user_email, push_subscription, radius_km
    HAVING COUNT(*) >= ${MIN_NEW_CATS}
  `)) as unknown as Array<{
    user_id: string;
    user_name: string;
    user_email: string;
    push_subscription: PushSubscriptionJSON | null;
    radius_km: number;
    pets: DigestRow["pets"];
  }>;

  let emailsSent = 0;
  let pushesSent = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const pets = (row.pets ?? []).slice(0, 5);
    if (pets.length < MIN_NEW_CATS) continue;

    const tpl = weeklyDigestEmailTemplate({
      pets: pets.map((c) => ({
        id: c.id,
        name: c.name,
        photoUrl: c.photoUrl,
        shelterName: c.shelterName,
        distanceKm: Number(c.distanceKm),
      })),
      userName: row.user_name,
    });

    // Email
    try {
      await sendEmail({ to: row.user_email, ...tpl });
      emailsSent += 1;
    } catch (err) {
      errors.push(
        `email ${row.user_email}: ${err instanceof Error ? err.message : "err"}`
      );
    }

    // Push (non bloquant)
    if (row.push_subscription) {
      try {
        const result = await sendPush(row.push_subscription, {
          title: `${pets.length} nouveaux chats près de chez vous`,
          body: `${pets
            .slice(0, 3)
            .map((c) => c.name)
            .join(", ")}${pets.length > 3 ? "…" : ""}`,
          data: { url: "/adopter" },
          tag: "weekly_digest",
        });
        if (result.gone) {
          await db.execute(
            sql`UPDATE users SET push_subscription = NULL WHERE id = ${row.user_id}`
          );
        } else {
          pushesSent += 1;
        }
      } catch {
        // silencieux — l'email reste la voie principale
      }
    }

    logEvent(
      "digest.weekly_sent",
      { catsCount: pets.length, hasPush: !!row.push_subscription },
      { userId: row.user_id }
    );
  }

  return NextResponse.json({
    usersEligible: rows.length,
    emailsSent,
    pushesSent,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    at: now.toISOString(),
  });
}
