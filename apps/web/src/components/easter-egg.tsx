"use client";

import { useEffect, useState } from "react";
import { playPurr } from "./purr-sound";

const PURRS = [
  "🐾 prrrr…",
  "🐾 ronron",
  "🐾 miaou",
  "🐾 prrrrr",
  "🐾 ronron…",
  "🐈‍⬛ prrr",
  "🐱 miaou",
  "🐾 hmm",
];

/** Nom du custom event dispatch par le logo cliqué N fois rapidement. */
export const EASTER_EGG_EVENT = "dorloter:easter-egg";

interface FloatingPurr {
  id: number;
  text: string;
  left: number;
  delay: number;
  duration: number;
}

/**
 * Easter egg : 4 clics rapprochés sur le logo (cf. `LogoEasterEggDetector`)
 * déclenchent une cascade de ronrons qui défile à l'écran.
 *
 * Ce composant écoute le `dorloter:easter-egg` event ; le compteur de
 * clics vit dans le composant logo (qui, lui, est mounté dans la navbar
 * sur toutes les pages). Mounté ici sur la home uniquement — pour qu'on
 * voie l'animation après les 4 clics, il faut donc être sur la home (ce
 * qui est cohérent : cliquer sur le logo y reste, c'est un no-op de
 * navigation).
 *
 * Honore prefers-reduced-motion : pas d'animation, juste un signal
 * discret de 2s.
 */
export function EasterEgg() {
  const [purrs, setPurrs] = useState<FloatingPurr[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let purrIdCounter = 0;

    function trigger() {
      // Son de ronron synthétisé. Best-effort : si l'AudioContext échoue
      // (politique d'autoplay, navigateur exotique), on laisse passer
      // — l'animation visuelle reste.
      void playPurr().catch(() => {
        // ignore — le son est un bonus, pas un blocant
      });

      if (reduceMotion) {
        const id = ++purrIdCounter;
        setPurrs([
          {
            id,
            text: "🐾 ronron silencieux",
            left: 50,
            delay: 0,
            duration: 2000,
          },
        ]);
        setTimeout(
          () => setPurrs((p) => p.filter((x) => x.id !== id)),
          2200
        );
        return;
      }

      const newPurrs: FloatingPurr[] = Array.from({ length: 14 }).map(
        () => ({
          id: ++purrIdCounter,
          text: PURRS[Math.floor(Math.random() * PURRS.length)]!,
          left: Math.random() * 90 + 5,
          delay: Math.random() * 600,
          duration: 3500 + Math.random() * 1500,
        })
      );
      setPurrs((p) => [...p, ...newPurrs]);

      const maxLifetime = 5500;
      setTimeout(() => {
        setPurrs((p) =>
          p.filter((x) => !newPurrs.some((np) => np.id === x.id))
        );
      }, maxLifetime);
    }

    window.addEventListener(EASTER_EGG_EVENT, trigger);
    return () => window.removeEventListener(EASTER_EGG_EVENT, trigger);
  }, [reduceMotion]);

  if (purrs.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
    >
      {purrs.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 select-none whitespace-nowrap text-2xl font-semibold text-coral-600 drop-shadow-sm"
          style={{
            left: `${p.left}%`,
            animation: reduceMotion
              ? "none"
              : `easter-rise ${p.duration}ms ease-out ${p.delay}ms forwards`,
            opacity: reduceMotion ? 1 : 0,
          }}
        >
          {p.text}
        </span>
      ))}
      <style>{`
        @keyframes easter-rise {
          0% {
            transform: translateY(0) rotate(-4deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) rotate(8deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
