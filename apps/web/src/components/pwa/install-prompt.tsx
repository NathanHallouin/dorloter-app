"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@shared/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "miaou-install-dismissed";

/**
 * Bouton "Installer l'app" intégré dans le menu — non intrusif.
 *
 * - On capture l'événement `beforeinstallprompt` au montage. Si le
 *   navigateur le déclenche, le bouton apparaît ; sinon rien (Safari iOS,
 *   navigateurs sans support PWA).
 * - L'utilisateur peut le déclencher quand il veut depuis le menu — pas
 *   de bannière intempestive en bas d'écran.
 * - Si l'user décline le prompt natif, on masque pour la session courante.
 *
 * Variant `compact` (texte seul, pour menu déroulant) ou `default`
 * (icône + texte, pour mobile menu plein écran).
 */
export function InstallButton({
  variant = "default",
  className,
}: {
  variant?: "default" | "compact";
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") {
      try {
        window.sessionStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // ignore
      }
      setDismissed(true);
    }
    setDeferred(null);
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={install}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-foreground transition hover:bg-muted",
          className
        )}
      >
        <Download className="h-3.5 w-3.5 text-coral-500" />
        Installer l&apos;app
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={install}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-coral-300 bg-coral-50 px-3 py-2.5 text-base font-medium text-coral-700 transition hover:bg-coral-100",
        className
      )}
    >
      <Download className="h-4 w-4" />
      Installer l&apos;app
    </button>
  );
}

/**
 * Compat ascendante : ancien export `InstallPrompt` qui rendait une
 * bannière auto. Ne fait désormais rien — la logique est déportée sur le
 * bouton de menu. Conservé pour ne pas casser les imports existants.
 */
export function InstallPrompt() {
  return null;
}
