"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, MapPin, Plus } from "lucide-react";
import { Input } from "@shared/ui/input";
import { Textarea } from "@shared/ui/textarea";
import { Button } from "@shared/ui/button";
import { LocationPicker } from "@/components/map/location-picker";
import { createSighting } from "@lost-found/public.client";
import type { SightingRow } from "@lost-found/public.client";

interface ReportSightingsSectionProps {
  reportId: string;
  isSignedIn: boolean;
  sightings: SightingRow[];
  defaultCenter?: { latitude: number; longitude: number };
}

export function ReportSightingsSection({
  reportId,
  isSignedIn,
  sightings,
  defaultCenter,
}: ReportSightingsSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

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
        setOpen(false);
        setLocation(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-lavande-700" />
          <h2 className="font-semibold text-foreground">
            Observations communauté
          </h2>
          <span className="rounded-full bg-lavande-100 px-2 py-0.5 text-[10px] font-bold text-lavande-700">
            {sightings.length}
          </span>
        </div>
        {isSignedIn && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-lavande-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-lavande-700"
          >
            <Plus className="h-3 w-3" />
            J&apos;ai vu cet animal
          </button>
        )}
      </header>

      {/* Form add sighting */}
      {open && (
        <form action={handleSubmit} className="space-y-4 border-b border-border p-4">
          <p className="text-sm text-muted-foreground">
            Aidez à retracer le parcours de cet animal. Cliquez sur la carte
            pour indiquer le lieu, puis décrivez ce que vous avez vu.
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
                Lat {location.lat.toFixed(5)} · Lng {location.lng.toFixed(5)}
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
              rows={3}
              required
              minLength={10}
              maxLength={1000}
              placeholder="Ex : Je l'ai aperçu sous une voiture rue des Lilas vers 18h, il a fui dans la cour de l'école…"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setLocation(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Publier l&apos;observation
            </Button>
          </div>
        </form>
      )}

      {/* Liste sightings */}
      {sightings.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {isSignedIn
            ? "Pas encore d'observation. Soyez le premier à signaler si vous l'avez croisé."
            : "Pas encore d'observation. Connectez-vous pour en ajouter une."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sightings.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lavande-100 text-lavande-700">
                  <Eye className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{s.description}</p>
                  {s.address && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {s.address}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Par <strong>{s.userName}</strong> ·{" "}
                    {new Date(s.observedAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
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
