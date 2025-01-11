"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, MapPin, Plus, X } from "lucide-react";
import { Input } from "@shared/ui/input";
import { Textarea } from "@shared/ui/textarea";
import { Button } from "@shared/ui/button";
import { LocationPicker } from "@/components/map/location-picker";
import { createSighting } from "@lost-found/public.client";

interface ReportSightingModalButtonProps {
  reportId: string;
  isSignedIn: boolean;
  defaultCenter?: { latitude: number; longitude: number };
}

/**
 * Bouton "J'ai vu cet animal" qui ouvre une modale plein écran centrée
 * pour ajouter un sighting. Variante allégée de `ReportSightingsSection`
 * adaptée à la sidebar droite : pas de liste, juste la création.
 */
export function ReportSightingModalButton({
  reportId,
  isSignedIn,
  defaultCenter,
}: ReportSightingModalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setLocation(null);
  }

  function handleSubmit(formData: FormData) {
    if (!location) {
      toast.error("Cliquez sur la carte pour indiquer où vous l'avez vu.");
      return;
    }
    formData.set("reportId", reportId);
    formData.set("latitude", String(location.lat));
    formData.set("longitude", String(location.lng));
    startTransition(async () => {
      const res = await createSighting(formData);
      if (res.success) {
        toast.success("Merci, votre observation aide à le retrouver.");
        close();
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  if (!isSignedIn) {
    return (
      <a
        href="/login"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-lavande-200 bg-lavande-50 px-4 py-2.5 text-sm font-semibold text-lavande-700 transition-colors hover:bg-lavande-100"
      >
        <Eye className="h-4 w-4" />
        Connectez-vous pour signaler une observation
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-lavande-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-lavande-600/20 transition-colors hover:bg-lavande-700"
      >
        <Eye className="h-4 w-4" />
        J&apos;ai vu cet animal
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="sighting-modal-title"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-5 py-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lavande-100 text-lavande-700">
                  <Eye className="h-4 w-4" />
                </span>
                <h2
                  id="sighting-modal-title"
                  className="text-lg font-semibold text-foreground"
                >
                  J&apos;ai vu cet animal
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form action={handleSubmit} className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                Aidez à retracer le parcours. Cliquez sur la carte pour
                indiquer le lieu, puis décrivez ce que vous avez vu.
              </p>

              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground">
                  Lieu d&apos;observation *
                </p>
                <LocationPicker
                  value={
                    location
                      ? { latitude: location.lat, longitude: location.lng }
                      : defaultCenter
                        ? {
                            latitude: defaultCenter.latitude,
                            longitude: defaultCenter.longitude,
                          }
                        : null
                  }
                  onChange={(coords) =>
                    setLocation({ lat: coords.latitude, lng: coords.longitude })
                  }
                />
                {location && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <MapPin className="mr-0.5 inline h-3 w-3" />
                    Lat {location.lat.toFixed(5)} · Lng{" "}
                    {location.lng.toFixed(5)}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Quand l'avez-vous vu ?" required>
                  <Input
                    name="observedAt"
                    type="datetime-local"
                    max={new Date().toISOString().slice(0, 16)}
                    required
                  />
                </Field>
                <Field label="Adresse approximative">
                  <Input
                    name="address"
                    placeholder="Rue, lieu-dit, quartier…"
                  />
                </Field>
              </div>

              <Field label="Que s'est-il passé ?" required>
                <Textarea
                  name="description"
                  rows={4}
                  required
                  minLength={10}
                  maxLength={1000}
                  placeholder="Ex : Je l'ai aperçu sous une voiture rue des Lilas vers 18h, il a fui dans la cour de l'école…"
                />
              </Field>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={close}
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  )}
                  <Plus className="mr-1 h-3 w-3" />
                  Publier l&apos;observation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-coral-500">*</span>}
      </span>
      {children}
    </label>
  );
}
