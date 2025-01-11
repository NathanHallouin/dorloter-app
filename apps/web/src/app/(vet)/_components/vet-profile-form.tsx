"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@shared/ui/input";
import { Textarea } from "@shared/ui/textarea";
import { Button } from "@shared/ui/button";
import {
  updateVeterinarian,
  updateSearchRadius,
} from "@veterinarians/public";

interface VetProfileFormProps {
  vet: {
    id: string;
    name: string;
    description: string | null;
    siret: string;
    orderNumber: string;
    address: string | null;
    location: { x: number; y: number } | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    acceptsCats: boolean;
    acceptsDogs: boolean;
    acceptsNac: boolean;
    emergencyAvailable: boolean;
    consultationPrice: string | null;
    openingHours: string | null;
    searchRadiusKm: number;
  };
}

export function VetProfileForm({ vet }: VetProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [radius, setRadius] = useState(vet.searchRadiusKm);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateVeterinarian(formData);
      if (res.success) {
        toast.success("Profil mis à jour.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  function handleRadiusSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("searchRadiusKm", String(radius));
      const res = await updateSearchRadius(fd);
      if (res.success) {
        toast.success("Rayon de recherche enregistré.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  return (
    <div className="space-y-8">
      <form action={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Informations légales
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SIRET" required>
              <Input
                name="siret"
                defaultValue={vet.siret}
                placeholder="14 chiffres"
                required
              />
            </Field>
            <Field label="Numéro ONV" required>
              <Input
                name="orderNumber"
                defaultValue={vet.orderNumber}
                placeholder="Ex : 12345"
                required
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Identité du cabinet
          </h2>
          <div className="grid gap-4">
            <Field label="Nom du cabinet" required>
              <Input name="name" defaultValue={vet.name} required />
            </Field>
            <Field label="Description publique" hint="Affichée sur la fiche annuaire">
              <Textarea
                name="description"
                defaultValue={vet.description ?? ""}
                rows={4}
                placeholder="Présentation rapide du cabinet, équipe, philosophie de soin…"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Contact et adresse
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone">
              <Input name="phone" defaultValue={vet.phone ?? ""} />
            </Field>
            <Field label="Email">
              <Input
                name="email"
                type="email"
                defaultValue={vet.email ?? ""}
              />
            </Field>
            <Field
              label="Adresse complète"
              hint="Numéro, rue, code postal, ville"
            >
              <Input name="address" defaultValue={vet.address ?? ""} />
            </Field>
            <Field label="Site web">
              <Input
                name="website"
                type="url"
                placeholder="https://..."
                defaultValue={vet.website ?? ""}
              />
            </Field>
            <Field
              label="Latitude"
              hint="Coordonnées GPS du cabinet (utilisées pour la recherche)"
            >
              <Input
                name="latitude"
                type="number"
                step="0.000001"
                defaultValue={vet.location?.y ?? ""}
                placeholder="48.856614"
              />
            </Field>
            <Field label="Longitude">
              <Input
                name="longitude"
                type="number"
                step="0.000001"
                defaultValue={vet.location?.x ?? ""}
                placeholder="2.3522219"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Activité
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="acceptsCats"
                defaultChecked={vet.acceptsCats}
                className="h-4 w-4 rounded border-border accent-teal-600"
              />
              <span className="text-sm">Prend en charge les chats</span>
            </label>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="acceptsDogs"
                defaultChecked={vet.acceptsDogs}
                className="h-4 w-4 rounded border-border accent-teal-600"
              />
              <span className="text-sm">Prend en charge les chiens</span>
            </label>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="acceptsNac"
                defaultChecked={vet.acceptsNac}
                className="h-4 w-4 rounded border-border accent-teal-600"
              />
              <span className="text-sm">
                Prend en charge les NAC (rongeurs, reptiles, oiseaux…)
              </span>
            </label>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="emergencyAvailable"
                defaultChecked={vet.emergencyAvailable}
                className="h-4 w-4 rounded border-border accent-teal-600"
              />
              <span className="text-sm">Urgences 24/7</span>
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Prix consultation indicatif (€)"
              hint="Information transparente pour les propriétaires"
            >
              <Input
                name="consultationPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={vet.consultationPrice ?? ""}
                placeholder="45"
              />
            </Field>
            <Field label="Horaires d'ouverture">
              <Input
                name="openingHours"
                defaultValue={vet.openingHours ?? ""}
                placeholder="Lun-Ven 9h-19h, Sam 9h-12h"
              />
            </Field>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Enregistrer les modifications
          </Button>
        </div>
      </form>

      <section className="rounded-xl border border-teal-200 bg-teal-50/30 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-700">
          Rayon de recherche signalements
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Détermine la zone géographique autour du cabinet dans laquelle vous
          pouvez consulter les signalements perdus/trouvés. Plafonné à 100 km
          pour limiter l&apos;exposition de données personnelles (RGPD).
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={100}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="flex-1 accent-teal-600"
          />
          <span className="w-16 text-right text-sm font-semibold tabular-nums text-teal-700">
            {radius} km
          </span>
          <Button
            onClick={handleRadiusSave}
            disabled={isPending || radius === vet.searchRadiusKm}
            variant="outline"
          >
            Enregistrer
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-coral-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
