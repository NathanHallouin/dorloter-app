import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@infra/db";
import { favorites, pets, petPhotos, reports, applications } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { PetCard } from "@adoption/public";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Megaphone, PawPrint as PawIcon, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Récupérer les favoris avec les infos chats
  const userFavorites = await db
    .select({
      pet: pets,
      favCreatedAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(pets, eq(favorites.petId, pets.id))
    .where(eq(favorites.userId, session.user.id))
    .orderBy(desc(favorites.createdAt))
    .limit(8);

  const favCatIds = userFavorites.map((f) => f.pet.id);
  const photos =
    favCatIds.length > 0
      ? await db
          .select()
          .from(petPhotos)
          .where(eq(petPhotos.isPrimary, true))
      : [];
  const photoMap = new Map(photos.map((p) => [p.petId, p]));

  // Comptes rapides
  const [userReports, userApps] = await Promise.all([
    db
      .select()
      .from(reports)
      .where(eq(reports.userId, session.user.id))
      .limit(1),
    db
      .select()
      .from(applications)
      .where(eq(applications.userId, session.user.id))
      .limit(1),
  ]);

  return (
    <PageContainer variant="wide">
      <PageHeader
        title={`Bonjour, ${session.user.name} !`}
        description="Votre espace personnel sur Dorloter."
      />

      {/* Actions rapides */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link href="/signaler">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="p-4 text-center">
              <Megaphone className="mx-auto h-7 w-7 text-coral-500" />
              <p className="mt-1 font-semibold">Signaler un animal</p>
              <p className="text-sm text-muted-foreground">
                Perdu ou trouvé
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/adopter">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="p-4 text-center">
              <PawIcon className="mx-auto h-7 w-7 text-lavande-500" />
              <p className="mt-1 font-semibold">Adopter</p>
              <p className="text-sm text-muted-foreground">
                Parcourir le catalogue
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mes-signalements">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="p-4 text-center">
              <ClipboardList className="mx-auto h-7 w-7 text-prune-500" />
              <p className="mt-1 font-semibold">Mes signalements</p>
              <p className="text-sm text-muted-foreground">
                {userReports.length > 0 ? "Voir mes signalements" : "Aucun signalement"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Favoris */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mes favoris</h2>
          {userFavorites.length > 0 && (
            <Link href="/adopter">
              <Button variant="ghost" size="sm">
                Voir tout
              </Button>
            </Link>
          )}
        </div>

        {userFavorites.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Vous n&apos;avez pas encore de favoris.
              </p>
              <Link href="/adopter">
                <Button variant="outline" className="mt-3">
                  Découvrir les animaux à adopter
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {userFavorites.map(({ pet }) => (
              <PetCard
                key={pet.id}
                pet={pet}
                photo={photoMap.get(pet.id)}
                isFavorite={true}
                showFavorite={true}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
