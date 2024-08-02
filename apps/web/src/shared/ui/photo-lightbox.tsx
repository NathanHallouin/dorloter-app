"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@shared/utils";

export interface LightboxPhoto {
  id: string;
  url: string;
  alt?: string | null;
  blurDataUrl?: string | null;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  altFallback?: string;
}

/**
 * Lightbox plein écran pour parcourir une galerie de photos.
 * - Esc pour fermer, flèches gauche/droite pour naviguer
 * - Swipe tactile basique sur mobile
 * - Lock du scroll body tant que la lightbox est ouverte
 * - Indicateurs (1/3) en haut, vignettes en bas si > 1 photo
 */
export function PhotoLightbox({
  photos,
  open,
  index,
  onClose,
  onIndexChange,
  altFallback,
}: PhotoLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const safeIndex = Math.min(Math.max(index, 0), Math.max(photos.length - 1, 0));
  const current = photos[safeIndex];
  const hasMultiple = photos.length > 1;

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((safeIndex - 1 + photos.length) % photos.length);
  }, [hasMultiple, onIndexChange, safeIndex, photos.length]);

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((safeIndex + 1) % photos.length);
  }, [hasMultiple, onIndexChange, safeIndex, photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, goPrev, goNext]);

  if (!mounted || !open || !current) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0]?.clientX ?? null);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX;
    const dx = endX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) goPrev();
      else goNext();
    }
    setTouchStartX(null);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photo"
      className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm tabular-nums opacity-80">
          {safeIndex + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Fermer la galerie"
          className="-mr-2 rounded-full p-2 transition hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center px-2 sm:px-12"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative h-full w-full max-w-5xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            key={current.id}
            src={current.url}
            alt={current.alt ?? altFallback ?? ""}
            fill
            sizes="100vw"
            className="object-contain"
            priority
            placeholder={current.blurDataUrl ? "blur" : "empty"}
            blurDataURL={current.blurDataUrl ?? undefined}
          />
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Photo précédente"
              className="absolute left-2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Photo suivante"
              className="absolute right-2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div
          className="flex justify-center gap-2 overflow-x-auto px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Aller à la photo ${i + 1}`}
              aria-current={i === safeIndex ? "true" : undefined}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-md ring-2 ring-transparent transition",
                i === safeIndex
                  ? "ring-white"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={p.url}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
