"use client";

/**
 * Lecteur audio inline pour les messages vocaux côté web.
 *
 * Repose sur l'élément natif `<audio>` (gestion buffering / codecs par le
 * navigateur). On affiche un contrôle minimaliste : bouton play/pause +
 * barre de progression + durée.
 */

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@shared/utils";

interface VoicePlayerProps {
  url: string;
  durationMs: number;
  mine: boolean;
}

export function VoicePlayerWeb({ url, durationMs, mine }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    function onTime() {
      setPositionMs(Math.round((a?.currentTime ?? 0) * 1000));
    }
    function onEnd() {
      setPlaying(false);
      setPositionMs(0);
      if (a) a.currentTime = 0;
    }
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      await a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;
  const remaining = Math.max(0, durationMs - positionMs);

  return (
    <div
      className={cn(
        "flex min-w-[200px] items-center gap-2 rounded-2xl px-3 py-2",
        mine ? "bg-coral-500 text-white" : "bg-muted text-foreground"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          mine ? "bg-white/20 hover:bg-white/30" : "bg-foreground/10 hover:bg-foreground/20"
        )}
        aria-label={playing ? "Pause" : "Lecture"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1">
        <div
          className={cn(
            "h-1 overflow-hidden rounded-full",
            mine ? "bg-white/30" : "bg-foreground/15"
          )}
        >
          <div
            className={cn(
              "h-1 rounded-full transition-all",
              mine ? "bg-white" : "bg-coral-500"
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className="min-w-[36px] text-right text-[11px] tabular-nums opacity-80">
        {formatDuration(remaining)}
      </span>
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
