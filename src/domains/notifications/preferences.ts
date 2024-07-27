/**
 * Préférences de notification — types et valeurs par défaut.
 *
 * Chaque type de notification peut être activé/désactivé indépendamment par
 * canal (push, email). Les valeurs par défaut sont conservatrices : on
 * privilégie les types à fort signal (correspondance, candidature) sur les
 * deux canaux, et on garde le reste en push uniquement.
 */

export const NOTIFICATION_TYPES = [
  "match_found",
  "application_update",
  "new_cat_nearby",
  "report_nearby",
  "new_message",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationChannel = "push" | "email";

export interface NotificationChannelPrefs {
  push: boolean;
  email: boolean;
}

export type NotificationPreferences = Record<
  NotificationType,
  NotificationChannelPrefs
>;

/**
 * Si le user n'a rien configuré, c'est ça qu'on applique.
 * Choix : on push tout par défaut (ça reste discret), on email uniquement
 * les événements à fort signal.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  match_found: { push: true, email: true },
  application_update: { push: true, email: true },
  new_message: { push: true, email: true },
  new_cat_nearby: { push: true, email: false },
  report_nearby: { push: true, email: false },
};

/**
 * Métadonnées affichables (libellés, descriptions) — utilisé par la page
 * réglages et par les emails de bienvenue éventuels.
 */
export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; description: string }
> = {
  match_found: {
    label: "Correspondance perdu/trouvé",
    description:
      "Quand un signalement proche du vôtre pourrait correspondre — c'est le cœur du service, on recommande de garder activé.",
  },
  application_update: {
    label: "Suivi de candidature",
    description:
      "Réponse du refuge sur une candidature d'adoption (acceptée, refusée, en cours).",
  },
  new_message: {
    label: "Messages reçus",
    description:
      "Quand un refuge ou un autre utilisateur vous écrit dans la messagerie.",
  },
  new_cat_nearby: {
    label: "Nouvel animal d'un refuge suivi",
    description:
      "Un refuge que vous suivez vient de publier un nouveau profil d'adoption.",
  },
  report_nearby: {
    label: "Rappel signalement",
    description:
      "Rappel hebdomadaire sur vos signalements actifs — pour penser à les marquer comme résolus si l'animal est rentré.",
  },
};

/**
 * Fusionne les préférences stockées (potentiellement partielles, ou null) avec
 * les défauts. Garantie : retourne toujours un objet complet, exploitable.
 */
export function mergeWithDefaults(
  stored: unknown
): NotificationPreferences {
  if (!stored || typeof stored !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  const out: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };
  for (const type of NOTIFICATION_TYPES) {
    const partial = (stored as Record<string, unknown>)[type];
    if (partial && typeof partial === "object") {
      out[type] = {
        push:
          typeof (partial as Record<string, unknown>).push === "boolean"
            ? Boolean((partial as Record<string, unknown>).push)
            : DEFAULT_NOTIFICATION_PREFERENCES[type].push,
        email:
          typeof (partial as Record<string, unknown>).email === "boolean"
            ? Boolean((partial as Record<string, unknown>).email)
            : DEFAULT_NOTIFICATION_PREFERENCES[type].email,
      };
    }
  }
  return out;
}

/**
 * Indique si un canal est autorisé pour un type donné, en s'appuyant sur les
 * préférences stockées (avec fallback défauts).
 */
export function isChannelEnabled(
  stored: unknown,
  type: NotificationType,
  channel: NotificationChannel
): boolean {
  const prefs = mergeWithDefaults(stored);
  return prefs[type][channel];
}
