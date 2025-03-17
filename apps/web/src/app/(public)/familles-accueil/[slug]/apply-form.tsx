"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import { applyAsFosterFamily } from "@shelters/public.client";

interface Props {
  shelterId: string;
  shelterName: string;
}

export function FosterApplyForm({ shelterId, shelterName }: Props) {
  const router = useRouter();
  const [acceptsCats, setAcceptsCats] = useState(true);
  const [acceptsDogs, setAcceptsDogs] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [hasGarden, setHasGarden] = useState(false);
  const [hasOtherPets, setHasOtherPets] = useState(false);
  const [otherPetsDescription, setOtherPetsDescription] = useState("");
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenAges, setChildrenAges] = useState("");
  const [experience, setExperience] = useState("");
  const [motivation, setMotivation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await applyAsFosterFamily({
        shelterId,
        acceptsCats,
        acceptsDogs,
        maxCapacity,
        hasGarden,
        hasOtherPets,
        otherPetsDescription,
        hasChildren,
        childrenAges,
        experience,
        motivation,
        address,
        phone,
      });
      if (!result.success) {
        toast.error(result.error ?? "Envoi impossible.");
        return;
      }
      toast.success(
        `Candidature envoyée à ${shelterName}. Le refuge vous répondra par email.`
      );
      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Espèces que vous pouvez accueillir
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptsCats}
            onChange={(e) => setAcceptsCats(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Chats
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptsDogs}
            onChange={(e) => setAcceptsDogs(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Chiens
        </label>
      </fieldset>

      <div>
        <Label htmlFor="capacity">Capacité maximale (animaux en même temps)</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          max={20}
          value={maxCapacity}
          onChange={(e) => setMaxCapacity(Number(e.target.value))}
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Environnement
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasGarden}
            onChange={(e) => setHasGarden(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          J&apos;ai un jardin
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasOtherPets}
            onChange={(e) => setHasOtherPets(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          J&apos;ai déjà un animal au foyer
        </label>
        {hasOtherPets && (
          <Textarea
            rows={2}
            value={otherPetsDescription}
            onChange={(e) => setOtherPetsDescription(e.target.value)}
            placeholder="Décrivez vos animaux actuels (espèce, âge, tempérament)"
            maxLength={500}
          />
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasChildren}
            onChange={(e) => setHasChildren(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Présence d&apos;enfants au foyer
        </label>
        {hasChildren && (
          <Input
            value={childrenAges}
            onChange={(e) => setChildrenAges(e.target.value)}
            placeholder="Âges (ex. 4 et 7 ans)"
            maxLength={200}
          />
        )}
      </fieldset>

      <div>
        <Label htmlFor="address">Adresse (facultatif)</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 rue de la République, 31000 Toulouse"
          maxLength={500}
        />
      </div>

      <div>
        <Label htmlFor="phone">Téléphone (facultatif)</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12 34 56 78"
          maxLength={20}
        />
      </div>

      <div>
        <Label htmlFor="experience">
          Expérience avec les animaux (facultatif)
        </Label>
        <Textarea
          id="experience"
          rows={3}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Avez-vous déjà été famille d'accueil ? Animaux possédés par le passé ?"
          maxLength={2000}
        />
      </div>

      <div>
        <Label htmlFor="motivation">Votre motivation</Label>
        <Textarea
          id="motivation"
          rows={5}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Pourquoi voulez-vous devenir famille d'accueil ? Pourquoi ce refuge ? Quel temps pouvez-vous y consacrer ?"
          maxLength={2000}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {motivation.length} caractères. 50 minimum.
        </p>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Envoi…" : "Envoyer ma candidature"}
        </Button>
      </div>
    </form>
  );
}
