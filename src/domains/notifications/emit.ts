import { db } from "@infra/db";
import { notifications, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  sendEmail,
  applicationUpdateEmailTemplate,
  matchFoundEmailTemplate,
  staleReportReminderEmailTemplate,
  newMessageEmailTemplate,
} from "@infra/email";
import { sendPush, type PushSubscriptionJSON } from "@infra/push/web-push";
import { mergeWithDefaults } from "./preferences";

type NotifType =
  | "match_found"
  | "application_update"
  | "new_cat_nearby"
  | "report_nearby"
  | "new_message";

interface EmitOptions {
  userId: string;
  type: NotifType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
  /**
   * Active l'envoi d'email transactionnel. `"auto"` (défaut) déclenche pour
   * les types à fort signal (application_update, match_found).
   */
  email?: boolean | "auto";
  /** Active l'envoi Web Push. Défaut : `"auto"` = même règle que l'email. */
  push?: boolean | "auto";
}

const FANOUT_AUTO_TYPES: NotifType[] = ["application_update", "match_found"];

/**
 * Persiste une notification en base et fait le fanout (email + web push) au
 * propriétaire. Point d'entrée unique pour tous les événements métier qui
 * doivent remonter à l'utilisateur.
 */
export async function emitNotification(opts: EmitOptions) {
  await db.insert(notifications).values({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    data: opts.data ?? null,
  });

  const isAuto = FANOUT_AUTO_TYPES.includes(opts.type);
  const wantEmail =
    opts.email === true || (opts.email !== false && isAuto);
  const wantPush =
    opts.push === true || (opts.push !== false && isAuto);

  if (!wantEmail && !wantPush) return;

  const [user] = await db
    .select({
      email: users.email,
      name: users.name,
      pushSubscription: users.pushSubscription,
      notificationPreferences: users.notificationPreferences,
    })
    .from(users)
    .where(eq(users.id, opts.userId))
    .limit(1);
  if (!user) return;

  // Préférences user : on respecte ses choix sauf opt-in explicite par
  // l'appelant (`email: true`/`push: true` force l'envoi malgré les prefs —
  // utilisé pour les emails transactionnels critiques type reset password).
  const prefs = mergeWithDefaults(user.notificationPreferences);
  const shouldEmail =
    opts.email === true ||
    (wantEmail && prefs[opts.type].email);
  const shouldPush =
    opts.push === true ||
    (wantPush && prefs[opts.type].push);

  if (shouldEmail) {
    try {
      const template = buildTemplate(opts);
      if (template) await sendEmail({ to: user.email, ...template });
    } catch (err) {
      console.error("emitNotification: envoi email échoué", err);
    }
  }

  if (shouldPush && user.pushSubscription) {
    try {
      const result = await sendPush(
        user.pushSubscription as PushSubscriptionJSON,
        {
          title: opts.title,
          body: opts.body ?? undefined,
          data: {
            ...(opts.data ?? {}),
            url: buildClickUrl(opts),
          },
          tag: opts.type,
        }
      );
      if (result.gone) {
        // Subscription expirée → purger
        await db
          .update(users)
          .set({ pushSubscription: null })
          .where(eq(users.id, opts.userId));
      }
    } catch (err) {
      console.error("emitNotification: envoi push échoué", err);
    }
  }
}

function buildClickUrl(opts: EmitOptions): string {
  const data = (opts.data ?? {}) as Record<string, string | undefined>;
  if (opts.type === "match_found" && data.reportId) {
    return `/perdus-trouves/${data.reportId}`;
  }
  if (opts.type === "application_update") return "/candidatures";
  if (opts.type === "new_cat_nearby" && data.petId) {
    return `/adopter/${data.petId}`;
  }
  if (opts.type === "report_nearby" && data.reportId) {
    return `/perdus-trouves/${data.reportId}`;
  }
  if (opts.type === "new_message" && data.url) {
    return data.url;
  }
  return "/notifications";
}

function buildTemplate(opts: EmitOptions) {
  const data = opts.data ?? {};
  if (opts.type === "application_update") {
    const petId = data.petId as string | undefined;
    const petName = (data.petName as string | undefined) ?? opts.title;
    const status = (data.status as
      | "en_cours"
      | "acceptee"
      | "refusee"
      | undefined) ?? "en_cours";
    const shelterNotes = (data.shelterNotes as string | null | undefined) ?? null;
    if (!petId) return null;
    return applicationUpdateEmailTemplate({ petName, status, shelterNotes });
  }
  if (opts.type === "match_found") {
    const reportId = data.reportId as string | undefined;
    const matchCount = (data.matchCount as number | undefined) ?? 1;
    const bestScore = (data.bestScore as number | undefined) ?? 0;
    const bestDistanceKm = (data.bestDistanceKm as number | undefined) ?? 0;
    if (!reportId) return null;
    return matchFoundEmailTemplate({
      reportId,
      matchCount,
      bestScore,
      bestDistanceKm,
    });
  }
  if (opts.type === "report_nearby") {
    // Réutilisé pour le rappel 7j d'un signalement stale
    const reportId = data.reportId as string | undefined;
    const reportType = data.reportType as "perdu" | "trouve" | undefined;
    const petName = (data.petName as string | null | undefined) ?? null;
    const daysActive = (data.daysActive as number | undefined) ?? 7;
    if (!reportId || !reportType) return null;
    return staleReportReminderEmailTemplate({
      reportId,
      type: reportType,
      petName,
      daysActive,
    });
  }
  if (opts.type === "new_message") {
    const senderName = (data.senderName as string | undefined) ?? "un contact";
    const preview = (data.preview as string | undefined) ?? opts.body ?? "";
    const conversationUrl = (data.url as string | undefined) ?? "/messages";
    const petName = (data.petName as string | null | undefined) ?? null;
    return newMessageEmailTemplate({
      senderName,
      preview,
      conversationUrl,
      petName,
    });
  }
  return null;
}
