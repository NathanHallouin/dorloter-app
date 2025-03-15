"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import { LocationPicker } from "@/components/map/location-picker";
import { ImageUploadField } from "./image-upload-field";
import { updateShelter } from "@shelters/actions";
import type { Shelter } from "@/types";

export function ShelterProfileForm({ shelter }: { shelter: Shelter }) {
  const router = useRouter();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    shelter.location
      ? { longitude: shelter.location.x, latitude: shelter.location.y }
      : null
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    if (location) {
      formData.set("latitude", String(location.latitude));
      formData.set("longitude", String(location.longitude));
    }

    const result = await updateShelter(shelter.id, formData);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Quelque chose a coincé.");
      return;
    }

    toast.success("Refuge mis à jour.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Visuels</h2>
        <div className="flex flex-wrap gap-6">
          <ImageUploadField
            name="logoUrl"
            label="Logo"
            initialUrl={shelter.logoUrl}
            aspect="square"
            hint="Carré, visible sur la fiche et en carte."
          />
          <ImageUploadField
            name="coverUrl"
            label="Bannière"
            initialUrl={shelter.coverUrl}
            aspect="wide"
            hint="Paysage 3:1, apparaît en haut de votre page refuge."
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Identité</h2>

        <div className="space-y-2">
          <Label htmlFor="name">Nom du refuge *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={shelter.name}
            required
            maxLength={255}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={shelter.description ?? ""}
            rows={4}
            placeholder="Présentez votre refuge, son histoire, ses valeurs…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              name="siret"
              defaultValue={shelter.siret ?? ""}
              maxLength={14}
              pattern="[0-9]{14}"
              placeholder="14 chiffres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="foundedYear">Année de création</Label>
            <Input
              id="foundedYear"
              name="foundedYear"
              type="number"
              min={1900}
              max={2100}
              defaultValue={shelter.foundedYear ?? ""}
              placeholder="1998"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Notre mission</h2>

        <div className="space-y-2">
          <Label htmlFor="missionLong">Texte long</Label>
          <Textarea
            id="missionLong"
            name="missionLong"
            defaultValue={shelter.missionLong ?? ""}
            rows={8}
            maxLength={2000}
            placeholder="Racontez l'histoire de votre refuge, vos valeurs, votre approche. Jusqu'à 2000 caractères."
          />
          <p className="text-xs text-muted-foreground">
            Affiché sur votre page publique, sous la bannière.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visitHours">Horaires de visite</Label>
          <Textarea
            id="visitHours"
            name="visitHours"
            defaultValue={shelter.visitHours ?? ""}
            rows={4}
            maxLength={500}
            placeholder={"Du mardi au samedi, 14h–18h\nDimanche sur rendez-vous"}
          />
        </div>

        <div className="space-y-4 rounded-xl border border-coral-200/60 bg-coral-50/30 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Soutenir le refuge
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dorloter ne collecte pas de dons. On affiche un encart qui
              redirige vers votre plateforme de collecte (HelloAsso, Stripe,
              virement, etc.).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donationUrl">Lien de don</Label>
            <Input
              id="donationUrl"
              name="donationUrl"
              type="url"
              defaultValue={shelter.donationUrl ?? ""}
              placeholder="https://helloasso.com/…"
            />
            <p className="text-xs text-muted-foreground">
              URL de votre cagnotte ou page de collecte externe.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donationLabel">Libellé du bouton (optionnel)</Label>
            <Input
              id="donationLabel"
              name="donationLabel"
              defaultValue={shelter.donationLabel ?? ""}
              maxLength={80}
              placeholder="HelloAsso, Notre cagnotte, Virement direct…"
            />
            <p className="text-xs text-muted-foreground">
              Affiché sur le bouton. Sans valeur, on affiche « Faire un don ».
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donationDescription">
              Message personnalisé (optionnel)
            </Label>
            <Textarea
              id="donationDescription"
              name="donationDescription"
              defaultValue={shelter.donationDescription ?? ""}
              rows={3}
              maxLength={500}
              placeholder="Comment l'argent est utilisé, déductibilité fiscale, etc."
            />
            <p className="text-xs text-muted-foreground">
              500 caractères max. Affiché au-dessus du bouton.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Contact</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={shelter.phone ?? ""}
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={shelter.email ?? ""}
              maxLength={255}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Site web</Label>
          <Input
            id="website"
            name="website"
            type="url"
            defaultValue={shelter.website ?? ""}
            placeholder="https://…"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Adresse</h2>

        <div className="space-y-2">
          <Label htmlFor="address">Adresse complète</Label>
          <Input
            id="address"
            name="address"
            defaultValue={shelter.address ?? ""}
            placeholder="7 rue Example, 75010 Paris"
          />
        </div>

        <div className="space-y-2">
          <Label>Position sur la carte</Label>
          <LocationPicker value={location} onChange={setLocation} height={280} />
        </div>
      </section>

      <Button type="submit" disabled={saving}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
