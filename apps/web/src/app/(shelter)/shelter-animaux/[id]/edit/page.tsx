import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Printer, Stethoscope } from "lucide-react";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import {
  getPetById,
  getPetPhotos,
  getTransferHistoryForPet,
  listShelterTransferTargets,
} from "@adoption/public";
import { PetForm } from "@adoption/public";
import { getTagsForShelter, getTagsForPet } from "@shelters/public";
import { PetTagsSection } from "./pet-tags-section";
import { PetTransferSection } from "./pet-transfer-section";

export const metadata: Metadata = {
  title: "Modifier un chat - Refuge",
};

export default async function EditCatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.shelterId) redirect("/dashboard");

  const pet = await getPetById(id);
  if (!pet || pet.shelterId !== session.user.shelterId) notFound();

  const [photos, availableTags, petTags, transferTargets, transferHistory] =
    await Promise.all([
      getPetPhotos(id),
      getTagsForShelter(session.user.shelterId),
      getTagsForPet(id),
      listShelterTransferTargets(session.user.shelterId),
      getTransferHistoryForPet(id),
    ]);

  const hasPendingTransfer = transferHistory.some(
    (t) => t.status === "en_attente"
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">
          Modifier {pet.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/shelter-animaux/${pet.id}/sante`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50"
          >
            <Stethoscope className="h-4 w-4" />
            Carnet médical
          </Link>
          <Link
            href={`/shelter-animaux/${pet.id}/fiche-cage`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50"
          >
            <Printer className="h-4 w-4" />
            Imprimer fiche cage
          </Link>
        </div>
      </div>

      {availableTags.length > 0 && (
        <PetTagsSection
          petId={pet.id}
          availableTags={availableTags}
          initialTagIds={petTags.map((t) => t.id)}
        />
      )}

      <PetTransferSection
        petId={pet.id}
        petName={pet.name}
        targets={transferTargets}
        history={transferHistory}
        hasPending={hasPendingTransfer}
      />

      <PetForm pet={pet} photos={photos} />
    </div>
  );
}
