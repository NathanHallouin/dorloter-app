"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { LocationPicker } from "@/components/map/location-picker";
import { updateProfile } from "@identity/actions/profile";

interface ProfileFormProps {
  initialName: string;
  initialEmail: string;
  initialPhone: string | null;
  initialLocation: { x: number; y: number } | null;
  initialRadiusKm: number | null;
}

export function ProfileForm({
  initialName,
  initialEmail,
  initialPhone,
  initialLocation,
  initialRadiusKm,
}: ProfileFormProps) {
  const router = useRouter();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    initialLocation
      ? { longitude: initialLocation.x, latitude: initialLocation.y }
      : null
  );
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm ?? 10);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    if (location) {
      formData.set("latitude", String(location.latitude));
      formData.set("longitude", String(location.longitude));
    }
    formData.set("notificationRadiusKm", String(radiusKm));

    const result = await updateProfile(formData);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Quelque chose a coincé.");
      return;
    }

    toast.success("C'est enregistré.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Identité</h2>

        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initialName}
            required
            maxLength={255}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={initialEmail} disabled />
          <p className="text-xs text-muted-foreground">
            Pour changer d&apos;adresse, écrivez-nous.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialPhone ?? ""}
            maxLength={20}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Alertes près de chez vous</h2>
        <p className="text-sm text-muted-foreground">
          Quand un chat est perdu ou trouvé dans votre zone, on vous prévient.
        </p>

        <div className="space-y-2">
          <Label>Ma position</Label>
          <LocationPicker value={location} onChange={setLocation} height={260} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="radiusKm">
            Rayon d&apos;alerte :{" "}
            <span className="font-semibold text-coral-600">{radiusKm} km</span>
          </Label>
          <input
            id="radiusKm"
            type="range"
            min={1}
            max={50}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-coral-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>
      </section>

      <Button type="submit" disabled={saving}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
