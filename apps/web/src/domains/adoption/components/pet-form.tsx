"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PetPhotoManager } from "./pet-photo-manager";
import type { PendingPhotoPayload } from "./pet-photo-manager";
import { createPet, updatePet } from "@adoption/actions/pets";
import type { Pet, PetPhoto } from "@/types";

interface PetFormProps {
  pet?: Pet;
  photos?: PetPhoto[];
}

type Species = "chat" | "chien";

export function PetForm({ pet, photos = [] }: PetFormProps) {
  const router = useRouter();
  const isEditing = !!pet;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotoPayload[]>([]);
  const [species, setSpecies] = useState<Species>(
    (pet?.species as Species | undefined) ?? "chat"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    for (const photo of pendingPhotos) {
      formData.append("photoUrl", photo.url);
      formData.append("photoBlur", photo.blurDataUrl ?? "");
    }

    const result = isEditing
      ? await updatePet(pet!.id, formData)
      : await createPet(formData);

    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Une erreur est survenue.");
      return;
    }

    router.push("/shelter-animaux");
    router.refresh();
  }

  const namePlaceholder = species === "chien" ? "Nom du chien" : "Nom du chat";
  const breedPlaceholder =
    species === "chien"
      ? "Berger, labrador, croisé..."
      : "Européen, Siamois, croisé...";
  const colorPlaceholder =
    species === "chien"
      ? "Fauve, noir, tricolore..."
      : "Noir, tigré, roux...";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Photos</h3>
        <PetPhotoManager
          existingPhotos={photos}
          onPendingChange={setPendingPhotos}
        />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="species">Espèce *</Label>
          <Select
            name="species"
            value={species}
            onValueChange={(v) => setSpecies(v as Species)}
            disabled={isEditing}
          >
            <SelectTrigger id="species">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="chien">Chien</SelectItem>
            </SelectContent>
          </Select>
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              L&apos;espèce ne se modifie pas après création.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={pet?.name}
            required
            placeholder={namePlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="breed">Race</Label>
          <Input
            id="breed"
            name="breed"
            defaultValue={pet?.breed ?? ""}
            placeholder={breedPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Couleur</Label>
          <Input
            id="color"
            name="color"
            defaultValue={pet?.color ?? ""}
            placeholder={colorPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sex">Sexe</Label>
          <Select name="sex" defaultValue={pet?.sex ?? "inconnu"}>
            <SelectTrigger>
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
          <Label htmlFor="ageCategory">Tranche d&apos;âge</Label>
          <Select name="ageCategory" defaultValue={pet?.ageCategory ?? ""}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chaton">
                {species === "chien" ? "Chiot (< 1 an)" : "Chaton (< 1 an)"}
              </SelectItem>
              <SelectItem value="jeune">Jeune (1–3 ans)</SelectItem>
              <SelectItem value="adulte">Adulte (3–10 ans)</SelectItem>
              <SelectItem value="senior">Senior (&gt; 10 ans)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adoptionFee">Frais d&apos;adoption (€)</Label>
          <Input
            id="adoptionFee"
            name="adoptionFee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={pet?.adoptionFee ?? ""}
            placeholder="150.00"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={pet?.description ?? ""}
            rows={4}
            placeholder="Personnalité, histoire, habitudes..."
          />
        </div>

        <div className="space-y-3 md:col-span-2">
          <h3 className="text-sm font-semibold">Santé</h3>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isSterilized"
                defaultChecked={pet?.isSterilized}
                className="rounded"
              />
              Stérilisé
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isChipped"
                defaultChecked={pet?.isChipped}
                className="rounded"
              />
              Pucé
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isVaccinated"
                defaultChecked={pet?.isVaccinated}
                className="rounded"
              />
              Vacciné
            </label>
            {species === "chat" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="indoorOnly"
                  defaultChecked={pet?.indoorOnly ?? false}
                  className="rounded"
                />
                Intérieur uniquement
              </label>
            )}
          </div>
        </div>

        {species === "chat" && (
          <div className="space-y-2">
            <Label htmlFor="fivFelv">FIV / FeLV</Label>
            <Select name="fivFelv" defaultValue={pet?.fivFelv ?? "non_teste"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_teste">Non testé</SelectItem>
                <SelectItem value="negatif">Négatif</SelectItem>
                <SelectItem value="fiv_positif">FIV+</SelectItem>
                <SelectItem value="felv_positif">FeLV+</SelectItem>
                <SelectItem value="fiv_felv_positif">FIV+ / FeLV+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3 md:col-span-2">
          <h3 className="text-sm font-semibold">Compatibilité</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Avec chats</Label>
              <Select
                name="okWithCats"
                defaultValue={pet?.okWithCats ?? "inconnu"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                  <SelectItem value="inconnu">Inconnu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Avec chiens</Label>
              <Select
                name="okWithDogs"
                defaultValue={pet?.okWithDogs ?? "inconnu"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                  <SelectItem value="inconnu">Inconnu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Avec enfants</Label>
              <Select
                name="okWithChildren"
                defaultValue={pet?.okWithChildren ?? "inconnu"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                  <SelectItem value="inconnu">Inconnu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="specialNeeds">Besoins spécifiques</Label>
          <Textarea
            id="specialNeeds"
            name="specialNeeds"
            defaultValue={pet?.specialNeeds ?? ""}
            rows={2}
            placeholder="Régime alimentaire, médicaments..."
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting
          ? "Enregistrement..."
          : isEditing
            ? "Mettre à jour"
            : "Ajouter l'animal"}
      </Button>
    </form>
  );
}
