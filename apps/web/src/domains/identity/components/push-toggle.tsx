"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@shared/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushToggle() {
  const { status, subscribed, busy, error, subscribe, unsubscribe } =
    usePushNotifications();

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {subscribed ? (
              <Bell className="h-5 w-5 text-coral-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <h3 className="font-semibold">Notifications push</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscribed
              ? "Activé : les alertes arrivent sur votre appareil."
              : "Les alertes importantes (matches, candidatures) arrivent sans que vous ayez besoin d'être sur le site."}
          </p>
        </div>

        {status === "unsupported" ? (
          <p className="text-xs text-muted-foreground">
            Non supporté sur ce navigateur.
          </p>
        ) : status === "denied" ? (
          <p className="text-xs text-destructive">
            Autorisation refusée. Activez-la dans les réglages du navigateur.
          </p>
        ) : subscribed ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={unsubscribe}
          >
            Désactiver
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={subscribe}>
            {busy ? "Activation..." : "Activer"}
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}
