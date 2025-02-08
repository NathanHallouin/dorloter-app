import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Printer } from "lucide-react";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { getPetById, getPetPhotos } from "@adoption/public";
import { PetForm } from "@adoption/public";

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

  const photos = await getPetPhotos(id);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">
          Modifier {pet.name}
        </h1>
        <Link
          href={`/shelter-animaux/${pet.id}/fiche-cage`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50"
        >
          <Printer className="h-4 w-4" />
          Imprimer fiche cage
        </Link>
      </div>
      <PetForm pet={pet} photos={photos} />
    </div>
  );
}
