"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine, Check, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import { submitTestimonial } from "@adoption/actions/testimonials";

/**
 * Formulaire de témoignage post-adoption. Affiché sur /adopter/[id] quand
 * l'utilisateur courant a une candidature acceptée pour ce chat.
 * Collapsible : tant qu'on ne clique pas "Raconter son histoire",
 * seule la bannière invitante est visible.
 */
export function TestimonialForm({
  petId,
  petName,
  existing,
}: {
  petId: string;
  petName: string;
  existing: { content: string; photoUrl: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!!existing);
  const [content, setContent] = useState(existing?.content ?? "");
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function handlePhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload échoué");
      setPhotoUrl(json.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (content.trim().length < 20) {
      toast.error("Le témoignage doit faire au moins 20 caractères.");
      return;
    }
    start(async () => {
      const r = await submitTestimonial({
        petId,
        content: content.trim(),
        photoUrl: photoUrl || undefined,
      });
      if (!r.success) {
        toast.error(r.error ?? "Échec de l'envoi.");
        return;
      }
      toast.success(
        existing
          ? "Témoignage mis à jour."
          : "Merci pour votre témoignage · il aidera d'autres adoptants à franchir le pas."
      );
      router.refresh();
    });
  }

  if (!open) {
    return (
      <section className="rounded-xl border border-lavande-200 bg-lavande-50/40 p-4">
        <div className="flex items-start gap-2.5">
          <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-lavande-700" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Vous avez adopté {petName} ?
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Racontez son histoire · votre témoignage aidera d&apos;autres
              adoptants hésitants.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => setOpen(true)}
            >
              <PenLine className="h-3.5 w-3.5" />
              Raconter notre histoire
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-lavande-700" />
        <h3 className="text-sm font-semibold text-foreground">
          {existing ? "Mettre à jour votre témoignage" : `L'histoire de ${petName}`}
        </h3>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Comment ${petName} a trouvé sa place chez vous ? Son caractère, ses manies, l'adaptation des premières semaines…`}
        rows={5}
        maxLength={1000}
        className="resize-none"
      />
      <p className="text-right text-[11px] text-muted-foreground">
        {content.length} / 1000
      </p>

      {/* Photo optionnelle */}
      {photoUrl ? (
        <div className="relative h-40 w-full overflow-hidden rounded-lg border border-border bg-muted">
          <Image src={photoUrl} alt="" fill className="object-cover" unoptimized />
          <button
            type="button"
            onClick={() => setPhotoUrl("")}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Retirer la photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground transition hover:border-lavande-400 hover:text-lavande-600">
          {uploading ? (
            "Upload…"
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              Ajouter une photo (optionnel)
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handlePhoto(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={pending || uploading || content.trim().length < 20}
          className="gap-1.5"
        >
          <Check className="h-4 w-4" />
          {pending ? "Envoi…" : existing ? "Mettre à jour" : "Publier"}
        </Button>
        {!existing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Annuler
          </Button>
        )}
      </div>
    </section>
  );
}
