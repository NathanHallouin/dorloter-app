"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@shared/ui/photo-lightbox";

interface PetPhotoGalleryProps {
  photos: LightboxPhoto[];
  fallbackUrl: string;
  alt: string;
}

/**
 * Galerie photo d'une fiche d'adoption.
 *
 * Layout : photo principale grande à gauche, jusqu'à 4 vignettes à droite.
 * Au clic sur n'importe quelle photo, ouvre la lightbox plein écran.
 */
export function PetPhotoGallery({
  photos,
  fallbackUrl,
  alt,
}: PetPhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const hasPhotos = photos.length > 0;
  const primary = photos[0];
  const secondary = photos.slice(1, 5);
  const remaining = Math.max(0, photos.length - 5);

  const openAt = (i: number) => {
    if (!hasPhotos) return;
    setIndex(i);
    setOpen(true);
  };

  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => openAt(0)}
          aria-label={hasPhotos ? `Agrandir la photo de ${alt}` : `Photo de ${alt}`}
          disabled={!hasPhotos}
          className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-muted disabled:cursor-default"
        >
          <Image
            src={primary?.url ?? fallbackUrl}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 512px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            priority
            placeholder={primary?.blurDataUrl ? "blur" : "empty"}
            blurDataURL={primary?.blurDataUrl ?? undefined}
          />
          {hasPhotos && (
            <span
              aria-hidden
              className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white opacity-0 transition group-hover:opacity-100"
            >
              <Expand className="h-4 w-4" />
            </span>
          )}
        </button>

        {secondary.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {secondary.map((photo, i) => {
              const isLast = i === secondary.length - 1 && remaining > 0;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openAt(i + 1)}
                  aria-label={`Agrandir la photo ${i + 2} de ${alt}`}
                  className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={photo.url}
                    alt={`${alt} — photo ${i + 2}`}
                    fill
                    sizes="200px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    placeholder={photo.blurDataUrl ? "blur" : "empty"}
                    blurDataURL={photo.blurDataUrl ?? undefined}
                  />
                  {isLast && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-semibold text-white">
                      +{remaining}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <PhotoLightbox
        photos={photos}
        open={open}
        index={index}
        onClose={() => setOpen(false)}
        onIndexChange={setIndex}
        altFallback={alt}
      />
    </>
  );
}
