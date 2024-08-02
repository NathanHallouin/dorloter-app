"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

/**
 * Widget Cloudflare Turnstile minimal (sans dépendance npm).
 *
 * Charge le script Cloudflare, rend un <div> qui devient le widget, et
 * remonte le token via `onVerify`. Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
 * n'est pas défini, le composant ne rend rien et appelle `onVerify("")`
 * immédiatement — pratique en dev sans compte Cloudflare.
 *
 * Documentation : https://developers.cloudflare.com/turnstile/
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) {
      // Pas de captcha configuré : on signale "token vide" pour que la
      // soumission puisse quand même passer (le plugin Better Auth est
      // également désactivé côté serveur dans ce cas).
      onVerify("");
      return;
    }

    function render() {
      if (!window.turnstile || !ref.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey!,
        callback: (token) => onVerify(token),
        "expired-callback": () => onVerify(""),
        "error-callback": () => onVerify(""),
      });
    }

    // Le script peut déjà être chargé (SPA nav) ou pas encore (cold load)
    if (window.turnstile) {
      render();
    } else {
      const handler = () => render();
      window.addEventListener("turnstile:loaded", handler);
      return () => window.removeEventListener("turnstile:loaded", handler);
    }
  }, [siteKey, onVerify]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        strategy="afterInteractive"
        onLoad={() => window.dispatchEvent(new Event("turnstile:loaded"))}
      />
      <div ref={ref} className="flex justify-center" />
    </>
  );
}
