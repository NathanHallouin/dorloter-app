"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { updateReport } from "@lost-found/actions";

type Sex = "male" | "femelle" | "inconnu";

interface PhotoState {
  file?: File;
  previewUrl: string;
  uploadedUrl?: string;
  blurDataUrl?: string | null;
  uploading: boolean;
  error?: string;
}

interface ReportEditFormProps {
  reportId: string;
  type: "perdu" | "trouve";
  species: "chat" | "chien";
  initialPetName: string | null;
  initialDescription: string;
  initialColor: string | null;
  initialBreed: string | null;
  initialSex: Sex;
  initialDistinctiveSigns: string | null;
  initialIsChipped: boolean;
  initialChipNumber: string | null;
  initialAddress: string | null;
  initialContactPhone: string | null;
  initialContactEmail: string | null;
  initialNotes: string | null;
  existingPhotosCount: number;
}

/**
 * Formulaire d'édition d'un signalement publié — alimenté par l'auteur
 * pour enrichir sa fiche après publication ("publication progressive").
 *
 * Limites :
 *   - Pas d'édition de type/espèce/lieu/date — ces changements créeraient
 *     un nouveau signalement (à supprimer + recréer).
 *   - Ajout de photos uniquement (pas de réorganisation/suppression — ça
 *     viendra plus tard via une UI dédiée).
 */
export function ReportEditForm({
  reportId,
  type,
  species,
  initialPetName,
  initialDescription,
  initialColor,
  initialBreed,
  initialSex,
  initialDistinctiveSigns,
  initialIsChipped,
  initialChipNumber,
  initialAddress,
  initialContactPhone,
  initialContactEmail,
  initialNotes,
  existingPhotosCount,
}: ReportEditFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoState[]>([]);

  const [petName, setPetName] = useState(initialPetName ?? "");
  const [description, setDescription] = useState(initialDescription);
  const [color, setColor] = useState(initialColor ?? "");
  const [breed, setBreed] = useState(initialBreed ?? "");
  const [sex, setSex] = useState<Sex>(initialSex);
  const [distinctiveSigns, setDistinctiveSigns] = useState(
    initialDistinctiveSigns ?? ""
  );
  const [isChipped, setIsChipped] = useState(initialIsChipped);
  const [chipNumber, setChipNumber] = useState(initialChipNumber ?? "");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [contactPhone, setContactPhone] = useState(initialContactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initialContactEmail ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");

  const totalPhotos = existingPhotosCount + photos.length;
  const remainingPhotos = Math.max(0, 5 - totalPhotos);

  async function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).slice(0, remainingPhotos);
    const next = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));
    setPhotos((p) => [...p, ...next]);

    for (const photo of next) {
      const idx = photos.length + next.indexOf(photo);
      try {
        const formData = new FormData();
        formData.append("file", photo.file!);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload échoué");
        setPhotos((p) =>
          p.map((ph, i) =>
            i === idx
              ? {
                  ...ph,
                  uploadedUrl: json.url,
                  blurDataUrl: json.blurDataUrl ?? null,
                  uploading: false,
                }
              : ph
          )
        );
      } catch (err) {
        setPhotos((p) =>
          p.map((ph, i) =>
            i === idx
              ? {
                  ...ph,
                  uploading: false,
                  error: err instanceof Error ? err.message : "Erreur",
                }
              : ph
          )
        );
      }
    }
  }

  function removePhoto(index: number) {
    setPhotos((p) => {
      const removed = p[index];
      if (removed?.file) URL.revokeObjectURL(removed.previewUrl);
      return p.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error("La description doit faire au moins 10 caractères.");
      return;
    }
    if (photos.some((p) => p.uploading)) {
      toast.error("Attendez la fin de l'upload des photos.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("petName", petName);
    formData.set("description", description);
    formData.set("color", color);
    formData.set("breed", breed);
    formData.set("sex", sex);
    formData.set("distinctiveSigns", distinctiveSigns);
    formData.set("isChipped", isChipped ? "on" : "");
    formData.set("chipNumber", chipNumber);
    formData.set("address", address);
    formData.set("contactPhone", contactPhone);
    formData.set("contactEmail", contactEmail);
    formData.set("notes", notes);
    for (const photo of photos) {
      if (photo.uploadedUrl) {
        formData.append("photoUrl", photo.uploadedUrl);
        formData.append("photoBlur", photo.blurDataUrl ?? "");
      }
    }

    const result = await updateReport(reportId, formData);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Erreur lors de la mise à jour.");
      return;
    }

    toast.success("Fiche mise à jour.");
    router.push(`/perdus-trouves/${reportId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {type === "perdu" && (
        <div className="space-y-2">
          <Label htmlFor="petName">
            {species === "chien" ? "Nom du chien" : "Nom du chat"}
          </Label>
          <Input
            id="petName"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            maxLength={255}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          rows={4}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="color">Couleur principale</Label>
          <Input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="breed">Race (si connue)</Label>
          <Input
            id="breed"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sex">Sexe</Label>
        <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
          <SelectTrigger id="sex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Mâle</SelectItem>
            <SelectItem value="femelle">Femelle</SelectItem>
            <SelectItem value="inconnu">Inconnu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="distinctiveSigns">Signes distinctifs</Label>
        <Textarea
          id="distinctiveSigns"
          value={distinctiveSigns}
          onChange={(e) => setDistinctiveSigns(e.target.value)}
          rows={2}
          placeholder="Cicatrice, oreille coupée, collier, tatouage…"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isChipped"
            checked={isChipped}
            onChange={(e) => setIsChipped(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="isChipped" className="font-normal">
            Pucé (identifiant électronique)
          </Label>
        </div>
        {isChipped && (
          <div className="space-y-2">
            <Label htmlFor="chipNumber">Numéro de puce (si connu)</Label>
            <Input
              id="chipNumber"
              value={chipNumber}
              onChange={(e) => setChipNumber(e.target.value)}
              maxLength={50}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse (optionnel)</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="15 rue de Rivoli, 75001 Paris"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Téléphone</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            maxLength={20}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            maxLength={255}
          />
        </div>
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">
        Coordonnées visibles publiquement sur la fiche.
      </p>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes complémentaires</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {remainingPhotos > 0 && (
        <div className="space-y-3">
          <Label>Ajouter des photos</Label>
          <p className="text-xs text-muted-foreground">
            Vous pouvez encore ajouter {remainingPhotos} photo
            {remainingPhotos > 1 ? "s" : ""} (5 max au total).
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((photo, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg border border-border bg-sable-100"
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
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label="Supprimer la photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-coral-400 hover:text-coral-500">
              <Camera className="h-5 w-5" />
              <span className="text-xs">Prendre</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-coral-400 hover:text-coral-500">
              <Upload className="h-5 w-5" />
              <span className="text-xs">Galerie</span>
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
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/perdus-trouves/${reportId}`)}
          disabled={submitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
