"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { createApplication } from "@adoption/actions/applications";

interface ApplicationFormProps {
  petId: string;
  petName: string;
}

export function ApplicationForm({ petId, petName }: ApplicationFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [hasChildren, setHasChildren] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("petId", petId);

    const result = await createApplication(formData);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Envoi impossible.");
      return;
    }

    router.push("/candidatures?new=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Où il vivrait</h2>

        <div className="space-y-2">
          <Label htmlFor="housingType">Type de logement</Label>
          <Select name="housingType" defaultValue="appartement">
            <SelectTrigger id="housingType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appartement">Appartement</SelectItem>
              <SelectItem value="maison">Maison</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasOutdoorAccess"
            name="hasOutdoorAccess"
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="hasOutdoorAccess" className="font-normal">
            J&apos;ai un accès extérieur (jardin, terrasse, balcon sécurisé)
          </Label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Qui est à la maison</h2>

        <div className="space-y-2">
          <Label htmlFor="hasOtherPets">Autres animaux</Label>
          <Textarea
            id="hasOtherPets"
            name="hasOtherPets"
            rows={2}
            placeholder="Avez-vous d'autres animaux ? Chat, chien, âge, caractère…"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasChildren"
            name="hasChildren"
            checked={hasChildren}
            onChange={(e) => setHasChildren(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="hasChildren" className="font-normal">
            Il y a des enfants dans le foyer
          </Label>
        </div>

        {hasChildren && (
          <div className="space-y-2">
            <Label htmlFor="childrenAges">Âges des enfants</Label>
            <Input
              id="childrenAges"
              name="childrenAges"
              placeholder="Ex : 6 et 10 ans"
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Ce que vous avez déjà vécu avec les chats</h2>

        <div className="space-y-2">
          <Label htmlFor="experience">En quelques mots</Label>
          <Textarea
            id="experience"
            name="experience"
            rows={3}
            placeholder="Un chat pendant mon enfance, deux en colocation, rien du tout mais très envie…"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pourquoi {petName}</h2>

        <div className="space-y-2">
          <Label htmlFor="motivation">
            Ce qui vous a touché
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (20 caractères minimum)
            </span>
          </Label>
          <Textarea
            id="motivation"
            name="motivation"
            rows={5}
            required
            minLength={20}
            placeholder={`Ce qui vous a accroché dans la fiche, la vie que vous pouvez lui offrir…`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="availability">Pour une visite, vous êtes plutôt</Label>
          <Input
            id="availability"
            name="availability"
            placeholder="Week-ends, un mardi soir, en journée…"
          />
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "On envoie ça au refuge…" : "Envoyer la candidature"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Le refuge reçoit votre message et revient vers vous. Vous retrouvez
        tout dans « Mes candidatures ».
      </p>
    </form>
  );
}
