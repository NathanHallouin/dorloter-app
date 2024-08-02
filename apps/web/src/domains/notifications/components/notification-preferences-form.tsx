"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bell, Mail } from "lucide-react";
import { updateNotificationPreferences } from "../actions/preferences";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_META,
  type NotificationPreferences,
  type NotificationType,
  type NotificationChannel,
} from "../preferences";

interface Props {
  initial: NotificationPreferences;
  pushSupported: boolean;
}

export function NotificationPreferencesForm({ initial, pushSupported }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const [pending, startTransition] = useTransition();

  function toggle(type: NotificationType, channel: NotificationChannel) {
    setPrefs((current) => {
      const next: NotificationPreferences = {
        ...current,
        [type]: {
          ...current[type],
          [channel]: !current[type][channel],
        },
      };
      save(next);
      return next;
    });
  }

  function save(next: NotificationPreferences) {
    startTransition(async () => {
      const res = await updateNotificationPreferences(next);
      if (res.success) {
        toast.success("Préférences enregistrées");
      } else {
        toast.error(res.error ?? "Erreur lors de la mise à jour");
      }
    });
  }

  function muteAll() {
    const next = Object.fromEntries(
      NOTIFICATION_TYPES.map((t) => [t, { push: false, email: false }])
    ) as NotificationPreferences;
    setPrefs(next);
    save(next);
  }

  function reset() {
    const next = Object.fromEntries(
      NOTIFICATION_TYPES.map((t) => [t, { push: true, email: true }])
    ) as NotificationPreferences;
    setPrefs(next);
    save(next);
  }

  // Essentiel = on garde uniquement les notifs à fort signal (correspondance
  // perdu/trouvé, suivi de candidature, messages reçus). Le reste est mute.
  function essentialsOnly() {
    const essentials = new Set<NotificationType>([
      "match_found",
      "application_update",
      "new_message",
    ]);
    const next = Object.fromEntries(
      NOTIFICATION_TYPES.map((t) => [
        t,
        essentials.has(t)
          ? { push: true, email: true }
          : { push: false, email: false },
      ])
    ) as NotificationPreferences;
    setPrefs(next);
    save(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="font-medium text-foreground">Réglages rapides</p>
          <p className="text-sm text-muted-foreground">
            Trois préréglages — vous pourrez réajuster type par type ensuite.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
            disabled={pending}
          >
            Tout activer
          </button>
          <button
            type="button"
            onClick={essentialsOnly}
            className="rounded-full border border-coral-300 bg-coral-50 px-3 py-1.5 text-sm font-medium text-coral-700 hover:bg-coral-100"
            disabled={pending}
          >
            Essentiel uniquement
          </button>
          <button
            type="button"
            onClick={muteAll}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
            disabled={pending}
          >
            Tout désactiver
          </button>
        </div>
      </div>

      {!pushSupported && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Les notifications push ne sont pas activées sur cet appareil.
          Activez-les depuis la cloche en haut de l&apos;écran pour recevoir
          les alertes en temps réel.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Type d&apos;alerte</span>
          <span className="flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" />
            Push
          </span>
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            Email
          </span>
        </div>
        <ul className="divide-y divide-border">
          {NOTIFICATION_TYPES.map((type) => {
            const meta = NOTIFICATION_TYPE_META[type];
            return (
              <li
                key={type}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{meta.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <Toggle
                  ariaLabel={`Notifications push : ${meta.label}`}
                  checked={prefs[type].push}
                  disabled={pending || !pushSupported}
                  onChange={() => toggle(type, "push")}
                />
                <Toggle
                  ariaLabel={`Notifications email : ${meta.label}`}
                  checked={prefs[type].email}
                  disabled={pending}
                  onChange={() => toggle(type, "email")}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Les modifications sont enregistrées automatiquement. Vous pouvez
        revenir ici à tout moment.
      </p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-coral-500" : "bg-sable-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
