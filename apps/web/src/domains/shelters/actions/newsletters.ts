"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import {
  shelterFollows,
  shelterNewsletters,
  shelters,
  users,
} from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import { sendEmail, shelterNewsletterEmailTemplate } from "@infra/email";
import { NEWSLETTER_KINDS } from "../lib/newsletter-types";
import type { ActionResponse } from "@/types";

const sendSchema = z.object({
  kind: z.enum(NEWSLETTER_KINDS as readonly [string, ...string[]]),
  subject: z.string().trim().min(4, "Sujet trop court").max(255),
  body: z.string().trim().min(20, "Contenu trop court").max(20000),
});

const RATE_LIMIT_HOURS = 6;

/**
 * Diffuse une newsletter à tous les followers d'un refuge. Best-effort
 * sur les envois individuels. L'historique est persisté avec le compte
 * de destinataires au moment de l'envoi.
 *
 * Rate-limit refuge : 1 newsletter toutes les 6 heures pour éviter qu'un
 * compte compromis ne spamme la base.
 */
export async function sendNewsletter(
  input: unknown
): Promise<ActionResponse<{ recipientCount: number; emailsSent: number }>> {
  const session = await requireShelter();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;

  // Rate-limit : pas plus d'une newsletter toutes les 6h.
  const cutoff = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000);
  const [recent] = await db
    .select({ sentAt: shelterNewsletters.sentAt })
    .from(shelterNewsletters)
    .where(eq(shelterNewsletters.shelterId, session.user.shelterId))
    .orderBy(shelterNewsletters.sentAt)
    .limit(1);
  if (recent && new Date(recent.sentAt) > cutoff) {
    return {
      success: false,
      error: `Une newsletter a déjà été envoyée dans les ${RATE_LIMIT_HOURS} dernières heures.`,
    };
  }

  // Récupération du nom du refuge + slug + liste followers
  const [[shelterRow], followers] = await Promise.all([
    db
      .select({ name: shelters.name, slug: shelters.slug })
      .from(shelters)
      .where(eq(shelters.id, session.user.shelterId))
      .limit(1),
    db
      .select({
        userId: shelterFollows.userId,
        email: users.email,
        name: users.name,
      })
      .from(shelterFollows)
      .innerJoin(users, eq(users.id, shelterFollows.userId))
      .where(eq(shelterFollows.shelterId, session.user.shelterId)),
  ]);

  if (!shelterRow) {
    return { success: false, error: "Refuge introuvable." };
  }
  if (followers.length === 0) {
    return {
      success: false,
      error: "Aucun abonné à votre refuge pour le moment.",
    };
  }

  // Fanout email best-effort. On ne bloque pas si certains envois
  // échouent — l'historique enregistre le nb tenté.
  let emailsSent = 0;
  for (const f of followers) {
    try {
      const tpl = shelterNewsletterEmailTemplate({
        userName: f.name,
        shelterName: shelterRow.name,
        shelterSlug: shelterRow.slug,
        subject: data.subject,
        body: data.body,
      });
      const result = await sendEmail({ to: f.email, ...tpl });
      if (result.success) emailsSent += 1;
    } catch (err) {
      console.error("newsletter: email échoué", err);
    }
  }

  await db.insert(shelterNewsletters).values({
    shelterId: session.user.shelterId,
    sentByUserId: session.user.id,
    kind: data.kind as never,
    subject: data.subject,
    body: data.body,
    recipientCount: followers.length,
  });

  revalidatePath("/shelter-newsletter");
  return {
    success: true,
    data: {
      recipientCount: followers.length,
      emailsSent,
    },
  };
}
