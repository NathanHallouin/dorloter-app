import webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@dorloter.fr";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

/**
 * Envoie un message push à une subscription. Renvoie `{ok: true}` en cas de
 * succès, `{ok: false, gone: true}` si l'abonnement est expiré (endpoint 404
 * ou 410) — l'appelant devrait alors purger la subscription en base.
 */
export async function sendPush(
  subscription: PushSubscriptionJSON,
  payload: PushPayload
): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  if (!ensureConfigured()) {
    return { ok: false, error: "VAPID non configuré" };
  }
  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 404 || e.statusCode === 410) {
      return { ok: false, gone: true };
    }
    return { ok: false, error: e.message ?? "Erreur push" };
  }
}
