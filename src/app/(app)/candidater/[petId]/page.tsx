import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@infra/db";
import { applications } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getPetWithDetails } from "@adoption/public";
import { requireAuth } from "@infra/auth/session";
import { ApplicationForm } from "@adoption/public";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Candidater",
};

interface PageProps {
  params: Promise<{ petId: string }>;
}

export default async function CandidaterPage({ params }: PageProps) {
  const { petId } = await params;
  const session = await requireAuth();

  const pet = await getPetWithDetails(petId);
  if (!pet) notFound();

  if (pet.status !== "disponible") {
    redirect(`/adopter/${petId}?unavailable=1`);
  }

  // Déjà candidaté ?
  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.petId, petId),
        eq(applications.userId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    redirect("/candidatures?already=1");
  }

  const primaryPhoto =
    pet.photos.find((p) => p.isPrimary) ?? pet.photos[0] ?? null;

  return (
    <PageContainer variant="narrow">
      <Link
        href={`/adopter/${petId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour à la fiche
      </Link>

      <header className="mb-8 flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sable-100">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.url}
              alt={pet.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">
              🐈
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Vous candidatez pour
          </p>
          <h1 className="text-2xl font-bold text-foreground">{pet.name}</h1>
          {pet.shelter && (
            <p className="text-sm text-muted-foreground">
              chez {pet.shelter.name}
            </p>
          )}
        </div>
      </header>

      <ApplicationForm petId={pet.id} petName={pet.name} />
    </PageContainer>
  );
}
