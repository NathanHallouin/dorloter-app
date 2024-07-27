"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import { LocationPicker } from "@/components/map/location-picker";
import { createPension, updatePension } from "@pensions/actions";
import type { Pension } from "@/types";

interface PensionProfileFormProps {
  pension?: Pension;
}

export function PensionProfileForm({ pension }: PensionProfileFormProps) {
  const router = useRouter();
  const isEditing = !!pension;
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<
    { latitude: number; longitude: number } | null
  >(
    pension?.location
      ? { latitude: pension.location.y, longitude: pension.location.x }
      : null
  );

  const services = (pension?.services ?? {}) as Record<string, boolean>;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!location) {
      toast.error("Indiquez l'adresse de la pension sur la carte.");
      return;
    }
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("latitude", String(location.latitude));
    formData.set("longitude", String(location.longitude));

    const res = isEditing
      ? await updatePension(pension!.id, formData)
      : await createPension(formData);
    setSubmitting(false);

    if (!res.success) {
      toast.error(res.error ?? "Une erreur est survenue.");
      return;
    }
    if (isEditing) {
      toast.success("Pension mise à jour.");
      router.refresh();
    } else {
      toast.success(
        "Pension créée. Elle sera visible dans l'annuaire après vérification par l'équipe Dorloter."
      );
      router.push("/pension-profil");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Informations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Nom de l&apos;établissement *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={pension?.name}
              required
              maxLength={255}
              placeholder="Pension féline du Luberon"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET *</Label>
            <Input
              id="siret"
              name="siret"
              defaultValue={pension?.siret ?? ""}
              required
              inputMode="numeric"
              pattern="\d{14}"
              maxLength={14}
              placeholder="14 chiffres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agrementNumber">Numéro d&apos;agrément</Label>
            <Input
              id="agrementNumber"
              name="agrementNumber"
              defaultValue={pension?.agrementNumber ?? ""}
              placeholder="Certificat de capacité ou ICPE"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Présentation</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={pension?.description ?? ""}
              rows={5}
              placeholder="Philosophie, encadrement, taille des box, sortie extérieure..."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Espèces accueillies et tarifs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="acceptsCats"
              defaultChecked={pension?.acceptsCats ?? false}
              className="rounded"
            />
            Accueille les chats
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="acceptsDogs"
              defaultChecked={pension?.acceptsDogs ?? false}
              className="rounded"
            />
            Accueille les chiens
          </label>
          <div className="space-y-2">
            <Label htmlFor="capacityCats">Capacité chats</Label>
            <Input
              id="capacityCats"
              name="capacityCats"
              type="number"
              min={0}
              defaultValue={pension?.capacityCats ?? ""}
              placeholder="20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacityDogs">Capacité chiens</Label>
            <Input
              id="capacityDogs"
              name="capacityDogs"
              type="number"
              min={0}
              defaultValue={pension?.capacityDogs ?? ""}
              placeholder="15"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricePerDayCat">Tarif chat / jour (€)</Label>
            <Input
              id="pricePerDayCat"
              name="pricePerDayCat"
              type="number"
              step="0.01"
              min={0}
              defaultValue={pension?.pricePerDayCat ?? ""}
              placeholder="15.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricePerDayDog">Tarif chien / jour (€)</Label>
            <Input
              id="pricePerDayDog"
              name="pricePerDayDog"
              type="number"
              step="0.01"
              min={0}
              defaultValue={pension?.pricePerDayDog ?? ""}
              placeholder="22.00"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Services</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {[
            { key: "medication", label: "Administration de médicaments" },
            { key: "grooming", label: "Toilettage" },
            { key: "outdoorAccess", label: "Accès extérieur sécurisé" },
            { key: "nightStaff", label: "Présence de nuit" },
            { key: "transport", label: "Transport aller/retour" },
            { key: "senior", label: "Seniors / soins adaptés" },
          ].map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`service_${s.key}`}
                defaultChecked={services[s.key] === true}
                className="rounded"
              />
              {s.label}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Contact</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={pension?.phone ?? ""}
              placeholder="04 90 00 00 00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={pension?.email ?? ""}
              placeholder="contact@pension.fr"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={pension?.website ?? ""}
              placeholder="https://"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="openingHours">Horaires d&apos;accueil</Label>
            <Textarea
              id="openingHours"
              name="openingHours"
              defaultValue={pension?.openingHours ?? ""}
              rows={3}
              placeholder="Lun-Ven 9h-18h / Samedi 10h-16h / Fermé le dimanche"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Adresse</h2>
        <div className="space-y-2">
          <Label htmlFor="address">Adresse postale *</Label>
          <Input
            id="address"
            name="address"
            defaultValue={pension?.address ?? ""}
            required
            placeholder="12 route des Alpilles, 84000 Avignon"
          />
        </div>
        <div className="space-y-2">
          <Label>Emplacement sur la carte *</Label>
          <LocationPicker value={location} onChange={setLocation} />
        </div>
      </section>

      <Button type="submit" disabled={submitting}>
        {submitting
          ? "Enregistrement..."
          : isEditing
            ? "Mettre à jour"
            : "Créer la pension"}
      </Button>
    </form>
  );
}
