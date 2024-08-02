/**
 * Client HTTP Expo Push.
 *
 * https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * On utilise l'endpoint v2/push/send qui accepte jusqu'à 100 messages
 * par batch. Le backend Dorloter ne gère pas (encore) l'API receipts —
 * on traite les erreurs synchrones du POST send et on ignore les
 * receipts asynchrones (~99% des delivery sont rapportés inline).
 *
 * Côté tokens invalides : Expo répond `status: "error"` avec
 * `details.error: "DeviceNotRegistered"` (token désinstallé), ou
 * `"InvalidCredentials"` (jamais en théorie pour un token Expo). Ces
 * tokens sont supprimés par le caller.
 */

import { logEvent } from "@infra/logger";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const MAX_BATCH = 100;

export interface ExpoPushMessage {
  to: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  /** Sound iOS / sound Android. `default` pour le son standard. */
  sound?: "default" | null;
  /** Badge iOS uniquement (count). */
  badge?: number;
  /** Channel Android (créé côté app via expo-notifications). */
  channelId?: string;
  /** TTL en secondes — si l'app est offline plus longtemps, le push est drop. */
  ttl?: number;
  /** Priorité Android : `default` | `normal` | `high`. */
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicketOk {
  status: "ok";
  id: string;
}

interface ExpoPushTicketError {
  status: "error";
  message: string;
  details?: {
    error?:
      | "DeviceNotRegistered"
      | "InvalidCredentials"
      | "MessageTooBig"
      | "MessageRateExceeded"
      | "MismatchSenderId";
  };
}

type ExpoPushTicket = ExpoPushTicketOk | ExpoPushTicketError;

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
  errors?: Array<{ code?: string; message?: string }>;
}

export interface ExpoPushSendResult {
  /** Nombre de pushs livrés à Expo (≠ delivery au device — c'est asynchrone). */
  sentCount: number;
  /** Tokens à supprimer côté DB (DeviceNotRegistered). */
  invalidTokens: string[];
  /** Erreurs non récupérables (rate-limit, etc.) — log + on poursuit. */
  errors: string[];
}

/**
 * Envoie un batch de messages Expo Push. Découpe automatiquement en
 * sous-batches de 100 si nécessaire.
 *
 * Renvoie la liste des tokens devenus invalides — au caller de purger
 * `device_tokens`.
 */
export async function sendExpoPush(
  messages: ExpoPushMessage[]
): Promise<ExpoPushSendResult> {
  if (messages.length === 0) {
    return { sentCount: 0, invalidTokens: [], errors: [] };
  }

  const batches: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += MAX_BATCH) {
    batches.push(messages.slice(i, i + MAX_BATCH));
  }

  const result: ExpoPushSendResult = {
    sentCount: 0,
    invalidTokens: [],
    errors: [],
  };

  for (const batch of batches) {
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        result.errors.push(`Expo Push HTTP ${res.status}`);
        continue;
      }

      const body = (await res.json()) as ExpoPushResponse;
      if (body.errors && body.errors.length > 0) {
        result.errors.push(
          ...body.errors.map((e) => e.message ?? "unknown error")
        );
      }

      const tickets = body.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "ok") {
          result.sentCount += 1;
          return;
        }
        const code = ticket.details?.error;
        if (code === "DeviceNotRegistered") {
          const token = batch[idx]?.to;
          if (token) result.invalidTokens.push(token);
        } else {
          result.errors.push(`${code ?? "?"}: ${ticket.message}`);
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`fetch: ${message}`);
    }
  }

  if (result.errors.length > 0) {
    logEvent(
      "push.expo.errors",
      { errors: result.errors, sentCount: result.sentCount },
      { level: "warn" }
    );
  }

  return result;
}
