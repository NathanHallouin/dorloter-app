import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint, Stethoscope, Heart } from "lucide-react";
import { inArray, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { petPhotos } from "@/server/db/schema";
import { and } from "drizzle-orm";
import { requireAuth } from "@infra/auth/session";
import { getAdoptedPetsForUser } from "@adoption/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@shared/ui/empty-state";
import { buttonVariants } from "@shared/ui/button";

export const metadata: Metadata = {
  title: "Mes animaux",
};

export default async function MesAnimauxPage() {
  const session = await requireAuth();
  const pets = await getAdoptedPetsForUser(session.user.id);

  // Photos primaires en batch
  let photoMap = new Map<string, string>();
  if (pets.length > 0) {
    const photos = await db
      .select({ petId: petPhotos.petId, url: petPhotos.url })
      .from(petPhotos)
      .where(
        and(
          inArray(
            petPhotos.petId,
            pets.map((p) => p.id)
          ),
          eq(petPhotos.isPrimary, true)
        )
      );
    photoMap = new Map(photos.map((p) => [p.petId, p.url]));
  }

  return (
    <PageContainer>
      <PageHeader
        title="Mes animaux"
        description="Les compagnons que vous avez adoptés via Dorloter. Carnet de santé, historique et souvenirs."
      />

      {pets.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="h-8 w-8" />}
          title="Aucun animal adopté pour le moment"
          hint="Une fois votre candidature acceptée par un refuge, l'animal apparaîtra ici avec son carnet médical."
          action={
            <Link
              href="/adopter/liste"
              className={buttonVariants({ size: "default" })}
            >
              <Heart className="mr-1.5 h-4 w-4" />
              Explorer les profils
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => {
            const photo = photoMap.get(pet.id);
            const adoptedSince = Math.floor(
              (Date.now() - new Date(pet.adoptedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const sinceLabel =
              adoptedSince < 30
                ? `${adoptedSince} j`
                : adoptedSince < 365
                  ? `${Math.floor(adoptedSince / 30)} mois`
                  : `${Math.floor(adoptedSince / 365)} an${adoptedSince >= 730 ? "s" : ""}`;
            return (
              <li key={pet.id}>
                <article className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-coral-300/70 hover:shadow-md">
                  <Link
                    href={`/mes-animaux/${pet.id}/sante`}
                    className="block"
                  >
                    <div className="relative h-44 bg-sable-100">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl">
                          {pet.species === "chat" ? "🐈" : "🐕"}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="text-xl font-bold text-foreground">
                        {pet.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {pet.species === "chat" ? "Chat" : "Chien"}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Adopté·e via{" "}
                        <span className="font-medium text-foreground">
                          {pet.shelterName}
                        </span>{" "}
                        · il y a {sinceLabel}
                      </p>
                    </div>
                  </Link>
                  <div className="flex gap-2 border-t border-border px-4 py-3">
                    <Link
                      href={`/mes-animaux/${pet.id}/sante`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-coral-600 hover:underline"
                    >
                      <Stethoscope className="h-3 w-3" />
                      Carnet médical
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
