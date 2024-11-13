"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Bandeau discret qui apparaît en haut quand le navigateur perd la
 * connexion. Le service worker sert les pages déjà visitées depuis le cache
 * (network-first → fallback cache) donc l'app reste navigable.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-14 z-40 flex items-center justify-center gap-2 bg-sable-900 px-4 py-1.5 text-xs font-medium text-sable-100"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Hors-ligne · seul le contenu déjà consulté est accessible.
    </div>
  );
}
