/**
 * Listeners du domaine veterinarians.
 *
 * Quand un signalement perdu/trouvé est publié, on alerte tous les
 * cabinets vétos vérifiés dont la position est dans leur rayon de
 * recherche. C'est le levier de visibilité pro le plus utile : un
 * animal blessé ou égaré finit souvent dans une consultation véto.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  vetReportAlerts,
  veterinarians,
  users,
} from "@/server/db/schema";
import { subscribe } from "@infra/event-bus";
import { emitNotification } from "@notifications/emit";
import {
  sendEmail,
  vetReportAlertEmailTemplate,
} from "@infra/email";
import type { ReportPublishedEvent } from "@lost-found/events";

const ALERT_RADIUS_FALLBACK_KM = 30;
const MAX_RADIUS_KM = 100;

subscribe<ReportPublishedEvent>(
  "lost-found.report_published",
  async (event) => {
    try {
      // Vétos vérifiés dont la position est dans leur propre rayon
      // (`searchRadiusKm`, plafonné à 100 km côté validation) autour du
      // signalement. ST_DWithin avec geography pour la précision.
      const maxMeters = MAX_RADIUS_KM * 1000;
      const matching = await db
        .select({
          vetId: veterinarians.id,
          vetName: veterinarians.name,
          vetSlug: veterinarians.slug,
          searchRadiusKm: veterinarians.searchRadiusKm,
          distanceMeters: sql<number>`ST_Distance(
            ${veterinarians.location}::geography,
            ST_SetSRID(ST_MakePoint(${event.lng}, ${event.lat}), 4326)::geography
          )`.as("distance_meters"),
        })
        .from(veterinarians)
        .where(
          and(
            eq(veterinarians.isVerified, true),
            sql`${veterinarians.location} IS NOT NULL`,
            sql`ST_DWithin(
              ${veterinarians.location}::geography,
              ST_SetSRID(ST_MakePoint(${event.lng}, ${event.lat}), 4326)::geography,
              ${maxMeters}
            )`,
            sql`ST_Distance(
              ${veterinarians.location}::geography,
              ST_SetSRID(ST_MakePoint(${event.lng}, ${event.lat}), 4326)::geography
            ) <= COALESCE(${veterinarians.searchRadiusKm}, ${ALERT_RADIUS_FALLBACK_KM}) * 1000`
          )
        );

      if (matching.length === 0) return;

      const vetIds = matching.map((m) => m.vetId);

      // Admins de chaque cabinet (rôle veterinarian_admin)
      const admins = await db
        .select({
          userId: users.id,
          email: users.email,
          name: users.name,
          vetId: users.vetId,
        })
        .from(users)
        .where(
          and(
            eq(users.role, "veterinarian_admin"),
            inArray(users.vetId, vetIds)
          )
        );

      const adminsByVet = new Map<string, typeof admins>();
      for (const a of admins) {
        if (!a.vetId) continue;
        const list = adminsByVet.get(a.vetId) ?? [];
        list.push(a);
        adminsByVet.set(a.vetId, list);
      }

      // Pour chaque véto matché : marquer l'alerte (idempotent), prévenir
      // les admins. Best-effort : un envoi raté ne casse pas les suivants.
      for (const row of matching) {
        const distMeters = Math.round(Number(row.distanceMeters));

        // Idempotence : ON CONFLICT DO NOTHING grâce à l'unique index
        // (vet_id, report_id).
        const [inserted] = await db
          .insert(vetReportAlerts)
          .values({
            vetId: row.vetId,
            reportId: event.reportId,
            distanceMeters: distMeters,
            emailSent: false,
            pushSent: false,
          })
          .onConflictDoNothing({
            target: [vetReportAlerts.vetId, vetReportAlerts.reportId],
          })
          .returning({ id: vetReportAlerts.id });

        // Si conflit → déjà alerté, on ne renvoie pas d'email.
        if (!inserted) continue;

        const recipients = adminsByVet.get(row.vetId) ?? [];

        let emailOk = false;
        let pushOk = false;
        for (const r of recipients) {
          try {
            const tpl = vetReportAlertEmailTemplate({
              userName: r.name,
              vetName: row.vetName,
              vetSlug: row.vetSlug,
              reportId: event.reportId,
              reportType: event.reportType,
              species: event.species,
              petName: event.petName,
              distanceMeters: distMeters,
            });
            const res = await sendEmail({ to: r.email, ...tpl });
            if (res.success) emailOk = true;
          } catch (err) {
            console.error("vet alert: email échoué", err);
          }

          try {
            await emitNotification({
              userId: r.userId,
              type: "report_nearby",
              title:
                event.reportType === "perdu"
                  ? `${event.species === "chat" ? "Chat" : "Chien"} perdu signalé à ${(distMeters / 1000).toFixed(1)} km`
                  : `${event.species === "chat" ? "Chat" : "Chien"} trouvé signalé à ${(distMeters / 1000).toFixed(1)} km`,
              body: event.petName
                ? `${event.petName} — alerte transmise aux cabinets du secteur.`
                : `Alerte transmise aux cabinets du secteur.`,
              data: {
                reportId: event.reportId,
                vetId: row.vetId,
                distanceMeters: distMeters,
                origin: "vet_alert",
              },
              email: false, // Email déjà envoyé manuellement avec template dédié
              push: true,
            });
            pushOk = true;
          } catch (err) {
            console.error("vet alert: push échoué", err);
          }
        }

        if (emailOk || pushOk) {
          await db
            .update(vetReportAlerts)
            .set({ emailSent: emailOk, pushSent: pushOk })
            .where(eq(vetReportAlerts.id, inserted.id));
        }
      }
    } catch (err) {
      console.error("[vet listener] report_published échoué", err);
    }
  }
);
