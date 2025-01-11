"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@shared/ui/input";
import { Textarea } from "@shared/ui/textarea";
import { Button } from "@shared/ui/button";
import { createVeterinarian } from "@veterinarians/public";

export function VetSignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createVeterinarian(formData);
      if (res.success && res.data) {
        toast.success("Cabinet créé. En attente de vérification.");
        router.push("/vet");
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Identification professionnelle
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SIRET" required>
            <Input
              name="siret"
              placeholder="14 chiffres"
              pattern="[0-9]{14}"
              required
            />
          </Field>
          <Field label="N° inscription ONV" required>
            <Input
              name="orderNumber"
              placeholder="Ex : 12345"
              required
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Cabinet
        </h2>
        <div className="grid gap-4">
          <Field label="Nom du cabinet" required>
            <Input name="name" required />
          </Field>
          <Field label="Slug URL" required hint="Lettres minuscules + tirets, ex : clinique-saint-jean">
            <Input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              placeholder="clinique-saint-jean"
            />
          </Field>
          <Field label="Description publique">
            <Textarea
              name="description"
              rows={3}
              placeholder="Présentation rapide du cabinet…"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Contact
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone">
            <Input name="phone" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" />
          </Field>
          <Field label="Adresse complète" hint="Pour la recherche géographique">
            <Input name="address" />
          </Field>
          <Field label="Site web">
            <Input name="website" type="url" placeholder="https://..." />
          </Field>
          <Field label="Latitude" hint="Coordonnées GPS du cabinet">
            <Input
              name="latitude"
              type="number"
              step="0.000001"
              placeholder="48.856614"
            />
          </Field>
          <Field label="Longitude">
            <Input
              name="longitude"
              type="number"
              step="0.000001"
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
              defaultChecked
              className="h-4 w-4 rounded border-border accent-teal-600"
            />
            <span className="text-sm">Chats</span>
          </label>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="acceptsDogs"
              defaultChecked
              className="h-4 w-4 rounded border-border accent-teal-600"
            />
            <span className="text-sm">Chiens</span>
          </label>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="acceptsNac"
              className="h-4 w-4 rounded border-border accent-teal-600"
            />
            <span className="text-sm">
              NAC (rongeurs, reptiles, oiseaux…)
            </span>
          </label>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="emergencyAvailable"
              className="h-4 w-4 rounded border-border accent-teal-600"
            />
            <span className="text-sm">Urgences 24/7</span>
          </label>
        </div>
      </section>

      <div className="rounded-xl border border-dashed border-sable-300 bg-sable-50/50 p-4 text-xs text-muted-foreground">
        En créant ce cabinet, vous certifiez sur l&apos;honneur être inscrit
        à l&apos;Ordre National des Vétérinaires et fournir des informations
        exactes. Les fausses déclarations entraînent la suppression
        immédiate du compte et peuvent faire l&apos;objet de poursuites.
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Créer mon cabinet
        </Button>
      </div>
    </form>
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
      {hint && (
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}
