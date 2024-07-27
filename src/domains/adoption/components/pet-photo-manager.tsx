"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { X, Upload, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { deletePetPhoto, reorderPetPhotos } from "@adoption/actions/pets";
import type { PetPhoto } from "@/types";

interface PendingPhoto {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  blurDataUrl?: string | null;
  uploading: boolean;
  error?: string;
}

export interface PendingPhotoPayload {
  url: string;
  blurDataUrl: string | null;
}

interface CatPhotoManagerProps {
  existingPhotos: PetPhoto[];
  maxPhotos?: number;
  onPendingChange?: (photos: PendingPhotoPayload[]) => void;
}

/**
 * Grid de photos pour l'édition d'un chat :
 * - existantes : star (primary) + X (delete) via Server Actions
 * - pendantes (nouvellement uploadées) : exposées via `onPendingChange` pour
 *   être envoyées avec le form principal en champs `photoUrl`
 */
export function PetPhotoManager({
  existingPhotos,
  maxPhotos = 8,
  onPendingChange,
}: CatPhotoManagerProps) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [photos, setPhotos] = useState(existingPhotos);
  const [transitionPending, startTransition] = useTransition();

  function updatePending(next: PendingPhoto[]) {
    setPending(next);
    onPendingChange?.(
      next
        .filter((p) => p.uploadedUrl)
        .map((p) => ({
          url: p.uploadedUrl!,
          blurDataUrl: p.blurDataUrl ?? null,
        }))
    );
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const room = maxPhotos - photos.length - pending.length;
    const accepted = Array.from(files).slice(0, room);
    const next: PendingPhoto[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));
    const newPending = [...pending, ...next];
    updatePending(newPending);

    for (const photo of next) {
      const idx = newPending.indexOf(photo);
      try {
        const formData = new FormData();
        formData.append("file", photo.file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload échoué");
        updatePending(
          newPending.map((p, i) =>
            i === idx
              ? {
                  ...p,
                  uploadedUrl: json.url,
                  blurDataUrl: json.blurDataUrl ?? null,
                  uploading: false,
                }
              : p
          )
        );
      } catch (err) {
        updatePending(
          newPending.map((p, i) =>
            i === idx
              ? {
                  ...p,
                  uploading: false,
                  error: err instanceof Error ? err.message : "Erreur",
                }
              : p
          )
        );
      }
    }
  }

  function removePending(index: number) {
    updatePending(
      pending.filter((_, i) => {
        if (i === index) URL.revokeObjectURL(pending[i]!.previewUrl);
        return i !== index;
      })
    );
  }

  function removeExisting(photoId: string) {
    startTransition(async () => {
      const r = await deletePetPhoto(photoId);
      if (r.success) {
        setPhotos((p) => p.filter((ph) => ph.id !== photoId));
      }
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({
      ...p,
      isPrimary: i === 0,
      order: i,
    }));
    setPhotos(reordered);

    // Persist côté serveur, sans bloquer l'UI
    const petId = photos[0]?.petId;
    if (!petId) return;
    startTransition(async () => {
      await reorderPetPhotos(
        petId,
        reordered.map((p) => p.id)
      );
    });
  }

  const total = photos.length + pending.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {/* Photos existantes — sortable */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            {photos.map((photo) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                disabled={transitionPending}
                onDelete={() => removeExisting(photo.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Photos en cours d'upload (nouvelles) */}
        {pending.map((photo, i) => (
          <div
            key={i}
            className="relative aspect-square overflow-hidden rounded-lg border border-coral-300 bg-sable-100"
          >
            <Image
              src={photo.previewUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
            {photo.uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                Upload…
              </div>
            )}
            {photo.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/80 p-2 text-xs text-white">
                {photo.error}
              </div>
            )}
            <button
              type="button"
              onClick={() => removePending(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Annuler l'ajout"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Bouton ajouter */}
        {total < maxPhotos && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-coral-400 hover:text-coral-500">
            <Upload className="h-5 w-5" />
            <span className="text-xs">Ajouter</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {total}/{maxPhotos} photo{total > 1 ? "s" : ""} · JPEG, PNG ou WebP, 5 Mo
        max · glisser-déposer pour réordonner (la première devient la
        principale)
      </p>
    </div>
  );
}

function SortablePhoto({
  photo,
  disabled,
  onDelete,
}: {
  photo: PetPhoto;
  disabled: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square overflow-hidden rounded-lg border border-border bg-sable-100 ${
        isDragging ? "shadow-xl ring-2 ring-coral-400" : ""
      }`}
    >
      <Image
        src={photo.url}
        alt=""
        fill
        sizes="200px"
        className="object-cover"
        draggable={false}
      />
      {photo.isPrimary && (
        <div className="absolute left-2 top-2 rounded-full bg-coral-500 px-2 py-0.5 text-xs font-medium text-white">
          Principale
        </div>
      )}

      {/* Poignée de drag (plein carré hors zone bouton) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Déplacer"
        className="absolute inset-0 cursor-grab touch-none opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
      >
        <span className="absolute left-2 bottom-2 rounded-full bg-black/70 p-1.5 text-white">
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Bouton supprimer (au-dessus de la poignée) */}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="absolute right-2 bottom-2 z-10 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition hover:bg-destructive group-hover:opacity-100"
        aria-label="Supprimer la photo"
        title="Supprimer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
