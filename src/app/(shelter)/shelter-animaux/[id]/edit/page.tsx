import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
      <h1 className="mb-8 text-3xl font-bold text-foreground">
        Modifier {pet.name}
      </h1>
      <PetForm pet={pet} photos={photos} />
    </div>
  );
}
