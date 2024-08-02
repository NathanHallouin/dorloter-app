"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PawPrint } from "lucide-react";
import { EASTER_EGG_EVENT } from "@/components/easter-egg";
import { cn } from "@shared/utils";

const REQUIRED_CLICKS = 4;
const CLICK_WINDOW_MS = 1500;

/**
 * Logo Dorloter — patte cliquable + texte cliquable, séparés.
 *
 *   - Le texte « dorloter » est un `<Link href="/">` qui ramène à
 *     l'accueil, comportement standard d'un logo.
 *   - L'icône patte est un `<button>` distinct : 4 clics rapprochés
 *     (< 1.5 s entre chaque) déclenchent l'événement
 *     `dorloter:easter-egg`, sans navigation. Le bouton vibre légèrement
 *     à chaque clic pour donner du feedback à l'utilisateur curieux.
 *
 * Visuellement, les deux éléments sont côte à côte avec le même alignement
 * que l'ancien logo monobloc — la séparation est invisible pour
 * l'utilisateur qui clique simplement le mot.
 */
export function LogoLink() {
  const clicksRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bumping, setBumping] = useState(false);

  function handlePawClick() {
    clicksRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clicksRef.current = 0;
    }, CLICK_WINDOW_MS);

    // Petit "bump" visuel pour récompenser la curiosité — sans bruit.
    setBumping(true);
    setTimeout(() => setBumping(false), 150);

    if (clicksRef.current >= REQUIRED_CLICKS) {
      clicksRef.current = 0;
      window.dispatchEvent(new CustomEvent(EASTER_EGG_EVENT));
    }
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={handlePawClick}
        aria-label="Patte Dorloter"
        className="inline-flex items-center justify-center rounded-full p-0.5 text-coral-500 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-300"
      >
        <PawPrint
          className={cn(
            "h-5 w-5 transition-transform duration-150",
            bumping && "scale-125 -rotate-12"
          )}
        />
      </button>
      <Link
        href="/"
        className="text-lg font-extrabold tracking-tight text-foreground"
      >
        dorloter
      </Link>
    </span>
  );
}
