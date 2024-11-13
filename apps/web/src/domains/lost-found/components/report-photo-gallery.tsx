"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@shared/ui/photo-lightbox";

interface ReportPhotoGalleryProps {
  photos: LightboxPhoto[];
  alt: string;
}

/**
 * Galerie photo des signalements perdus/trouvés.
 *
 * Layout masonry : la première photo occupe 2x2, les suivantes des cases
 * carrées. Au clic, ouvre la lightbox plein écran.
 */
export function ReportPhotoGallery({ photos, alt }: ReportPhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <>
      <section
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3"
        aria-label={`Photos · ${alt}`}
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => openAt(i)}
            aria-label={`Agrandir la photo ${i + 1}`}
            className={`group relative cursor-zoom-in overflow-hidden rounded-lg bg-sable-100 ${
              i === 0
                ? "col-span-2 row-span-2 aspect-video"
                : "aspect-square"
            }`}
          >
            <Image
              src={photo.url}
              alt={photo.alt ?? `${alt} · photo ${i + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              placeholder={photo.blurDataUrl ? "blur" : "empty"}
              blurDataURL={photo.blurDataUrl ?? undefined}
            />
            <span
              aria-hidden
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
            >
              <Expand className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </section>

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
