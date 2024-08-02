import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { buttonVariants } from "@shared/ui/button";
import { PetCard } from "@adoption/public";
import { db } from "@infra/db";
import { pets, petPhotos, favorites } from "@/server/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "@infra/auth/session";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Mes coups de cœur",
};

export default async function FavorisPage() {
  const session = await requireAuth();

  const rows = await db
    .select({ pet: pets, favCreatedAt: favorites.createdAt })
    .from(favorites)
    .innerJoin(pets, eq(pets.id, favorites.petId))
    .where(eq(favorites.userId, session.user.id))
    .orderBy(desc(favorites.createdAt));

  const petIds = rows.map((r) => r.pet.id);
  const photos =
    petIds.length > 0
      ? await db
          .select()
          .from(petPhotos)
          .where(
            and(
              inArray(petPhotos.petId, petIds),
              eq(petPhotos.isPrimary, true)
            )
          )
      : [];
  const photoMap = new Map(photos.map((p) => [p.petId, p]));

  return (
    <PageContainer variant="wide">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Heart className="h-7 w-7 text-coral-500" fill="currentColor" />
            Mes coups de cœur
          </span>
        }
        description={`${rows.length} chat${rows.length > 1 ? "s" : ""} mis en favori`}
        actions={
          <Link
            href="/adopter"
            className={buttonVariants({ variant: "outline" })}
          >
            Découvrir d&apos;autres chats
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          variant="illustrated"
          icon={<Heart className="h-10 w-10" />}
          title="Aucun favori pour l'instant"
          hint="Touchez le cœur sur un profil et il atterrit ici. Vous pourrez ainsi le retrouver et y revenir tranquillement."
          action={
            <Link
              href="/adopter"
              className={buttonVariants({ variant: "default" })}
            >
              Parcourir les animaux
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ pet }) => (
            <PetCard
              key={pet.id}
              pet={pet}
              photo={photoMap.get(pet.id)}
              isFavorite
              showFavorite
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
