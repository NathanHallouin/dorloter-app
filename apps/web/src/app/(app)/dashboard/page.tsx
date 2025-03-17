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
import {
  Megaphone,
  PawPrint as PawIcon,
  ClipboardList,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { getSponsoredPetsForUser } from "@adoption/public";
import {
  getActiveFosterFamiliesForUser,
  getActivePlacementsForUser,
  FOSTER_PLACEMENT_STATUS_CLASSES,
  FOSTER_PLACEMENT_STATUS_LABELS,
} from "@shelters/public";
import Image from "next/image";
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

  // Animaux parrainés
  const sponsoredPets = await getSponsoredPetsForUser(session.user.id);

  // Statuts famille d'accueil
  const [fosterFamilies, fosterPlacements] = await Promise.all([
    getActiveFosterFamiliesForUser(session.user.id),
    getActivePlacementsForUser(session.user.id),
  ]);

  // Compteur animaux adoptés (candidatures acceptées)
  const acceptedApps = await db
    .select({ petId: applications.petId })
    .from(applications)
    .where(
      and(
        eq(applications.userId, session.user.id),
        eq(applications.status, "acceptee")
      )
    );
  const adoptedCount = new Set(acceptedApps.map((a) => a.petId)).size;

  return (
    <PageContainer variant="wide">
      <PageHeader
        title={`Bonjour, ${session.user.name} !`}
        description="Votre espace personnel sur Dorloter."
      />

      {/* Actions rapides */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adoptedCount > 0 && (
          <Link href="/mes-animaux">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-4 text-center">
                <Stethoscope className="mx-auto h-7 w-7 text-coral-600" />
                <p className="mt-1 font-semibold">Mes animaux</p>
                <p className="text-sm text-muted-foreground">
                  {adoptedCount} adopté{adoptedCount > 1 ? "s" : ""} · carnet
                  médical
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
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

      {/* Parrainages symboliques */}
      {sponsoredPets.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold">
              <Sparkles className="h-5 w-5 text-coral-500" />
              Mes parrainages
              <span className="rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-coral-800">
                {sponsoredPets.length}
              </span>
            </h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sponsoredPets.map((p) => {
              const statusLabel: Record<typeof p.petStatus, string> = {
                pre_adoptable: "En observation",
                disponible: "À adopter",
                reserve: "Réservé",
                adopte: "Adopté",
                retire: "Retiré",
              };
              return (
                <li
                  key={p.petId}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-coral-300"
                >
                  <Link
                    href={`/adopter/${p.petId}`}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sable-100"
                  >
                    {p.primaryPhotoUrl ? (
                      <Image
                        src={p.primaryPhotoUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-2xl">
                        {p.species === "chat" ? "🐈" : "🐕"}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/adopter/${p.petId}`}
                      className="block truncate font-semibold text-foreground hover:text-coral-600"
                    >
                      {p.petName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {statusLabel[p.petStatus]} · {p.shelterName}
                    </p>
                    {p.message && (
                      <p className="mt-0.5 truncate text-[11px] italic text-muted-foreground">
                        « {p.message} »
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {fosterFamilies.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold">
              <PawIcon className="h-5 w-5 text-coral-500" />
              Famille d&apos;accueil
            </h2>
          </div>
          <div className="space-y-3">
            {fosterFamilies.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-border bg-card p-4 text-sm"
              >
                <p className="text-foreground">
                  Vous êtes FA active pour{" "}
                  <Link
                    href={`/refuges/${f.shelterSlug}`}
                    className="font-semibold text-coral-700 hover:underline"
                  >
                    {f.shelterName}
                  </Link>{" "}
                  · capacité {f.maxCapacity} · statut{" "}
                  <span className="font-medium">{f.status}</span>
                </p>
              </div>
            ))}

            {fosterPlacements.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {fosterPlacements.map((p) => {
                  const cl = FOSTER_PLACEMENT_STATUS_CLASSES[p.status];
                  return (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sable-100">
                        {p.petPrimaryPhotoUrl ? (
                          <Image
                            src={p.petPrimaryPhotoUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-2xl">
                            {p.petSpecies === "chat" ? "🐈" : "🐕"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-foreground">
                            {p.petName}
                          </strong>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
                          >
                            {FOSTER_PLACEMENT_STATUS_LABELS[p.status]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Depuis le{" "}
                          {new Date(p.startDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}
                          {p.expectedEndDate &&
                            ` · prévu jusqu'au ${new Date(p.expectedEndDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.shelterName}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                Aucun placement en cours. Le refuge vous proposera un animal
                quand un cas se présentera.
              </p>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
