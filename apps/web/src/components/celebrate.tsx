"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
  color: string;
  size: number;
  shape: "square" | "circle";
}

const COLORS = [
  "#e8634d", // coral-500
  "#ff8066", // coral-400
  "#a98ccc", // lavande-400
  "#7d5fa6", // lavande-600
  "#facc15", // amber-400
  "#34d399", // green-400
];

interface CelebrateProps {
  /**
   * Identifiant unique de l'événement à célébrer (ex. ID d'une candidature
   * acceptée). On stocke `dorloter:celebrated:{id}` en localStorage pour
   * ne déclencher qu'une seule fois par utilisateur.
   */
  eventId: string;
  /** Particules par défaut : 50 — densité raisonnable, pas envahissant. */
  particleCount?: number;
  /** Durée moyenne d'une particule en ms. */
  durationMs?: number;
}

/**
 * Pluie de confettis CSS — pour célébrer les bonnes nouvelles (candidature
 * acceptée, retrouvaille confirmée). Pas de lib externe : ~80 lignes de
 * SVG-free pur DOM.
 *
 * - Honore prefers-reduced-motion : si l'user en a fait la demande, on
 *   skip totalement (pas même un toast — l'événement est de toute façon
 *   annoncé via la notification métier).
 * - Une seule fois par eventId (localStorage flag).
 * - Auto-démontage après l'animation.
 */
export function Celebrate({
  eventId,
  particleCount = 50,
  durationMs = 3500,
}: CelebrateProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const storageKey = `dorloter:celebrated:${eventId}`;
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // localStorage indisponible (navigation privée) — on célèbre quand
      // même, ça n'arrivera juste plus tant que la page n'est pas rechargée
    }

    const next: Particle[] = Array.from({ length: particleCount }).map(
      (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 600,
        duration: durationMs + Math.random() * 800,
        drift: (Math.random() - 0.5) * 200,
        rotation: Math.random() * 720 - 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        size: 6 + Math.random() * 8,
        shape: Math.random() > 0.5 ? "square" : "circle",
      })
    );
    setParticles(next);

    const cleanup = setTimeout(
      () => setParticles([]),
      durationMs + 1500
    );
    return () => clearTimeout(cleanup);
  }, [eventId, particleCount, durationMs]);

  if (particles.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-10vh] block"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            animation: `celebrate-fall ${p.duration}ms ease-out ${p.delay}ms forwards`,
            ["--drift" as string]: `${p.drift}px`,
            ["--rotation" as string]: `${p.rotation}deg`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes celebrate-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift, 0), 110vh, 0) rotate(var(--rotation, 0));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
