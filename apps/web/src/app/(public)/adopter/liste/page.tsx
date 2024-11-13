import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PetFilters } from "@adoption/public";
import { PetCard } from "@adoption/public";
import { CatalogModeToggle } from "@adoption/public";
import { getPets } from "@adoption/public";
import { db } from "@infra/db";
import { petPhotos, favorites } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { Button } from "@shared/ui/button";
import Link from "next/link";
import { Heart, MapPin, Sparkles, Search } from "lucide-react";
import { EmptyState } from "@shared/ui/empty-state";

export const metadata: Metadata = {
  title: "Liste des animaux à adopter",
  description:
    "Parcourez tous les chats et chiens à adopter chez les refuges partenaires. Filtrez par espèce, âge, sexe et compatibilité avec vos enfants ou autres animaux.",
  alternates: { canonical: "/adopter/liste" },
  openGraph: {
    title: "Tous les animaux à adopter · Dorloter",
    description:
      "Catalogue complet des chats et chiens à adopter, filtres par compatibilité et géographie.",
    url: "/adopter/liste",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tous les animaux à adopter · Dorloter",
    description:
      "Catalogue complet, filtrable, des chats et chiens proposés à l'adoption.",
  },
};

const ITEMS_PER_PAGE = 12;

export default async function AdopterListePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const filters = {
    species: typeof params.species === "string" ? params.species : undefined,
    sex: typeof params.sex === "string" ? params.sex : undefined,
    ageCategory:
      typeof params.ageCategory === "string" ? params.ageCategory : undefined,
    okWithCats:
      typeof params.okWithCats === "string" ? params.okWithCats : undefined,
    okWithDogs:
      typeof params.okWithDogs === "string" ? params.okWithDogs : undefined,
    okWithChildren:
      typeof params.okWithChildren === "string"
        ? params.okWithChildren
        : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
  };

  const { pets: catsList, total } = await getPets(
    filters,
    ITEMS_PER_PAGE,
    offset
  );
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const petIds = catsList.map((c) => c.id);
  const photos =
    petIds.length > 0
      ? await db.select().from(petPhotos).where(eq(petPhotos.isPrimary, true))
      : [];
  const photoMap = new Map(photos.map((p) => [p.petId, p]));

  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  const userFavorites = new Set<string>();
  if (session) {
    const favs = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, session.user.id));
    favs.forEach((f) => userFavorites.add(f.petId));
  }

  const filterParams = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v) as [string, string][]
  );

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* Hero éditorial */}
        <section className="relative mb-10 overflow-hidden rounded-3xl bg-linear-to-br from-coral-50 via-white to-lavande-50 px-6 py-10 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-coral-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-lavande-200/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-coral-700 shadow-sm ring-1 ring-coral-200/50">
              <Sparkles className="h-3 w-3" />
              Galerie des animaux à adopter
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Qui pourrait vivre
              <br />
              <span className="bg-linear-to-r from-coral-500 to-coral-400 bg-clip-text text-transparent">
                chez vous ?
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              {total > 0 ? (
                <>
                  <strong className="font-semibold text-foreground">
                    {total}
                  </strong>{" "}
                  profil{total > 1 ? "s" : ""} à feuilleter, chacun avec son
                  caractère. Prenez le temps de trouver le bon.
                </>
              ) : (
                "Les refuges partenaires mettent en ligne de nouveaux chats chaque semaine."
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <CatalogModeToggle mode="list" />
              <Link
                href="/adopter/villes"
                className="inline-flex items-center gap-1.5 rounded-full border border-sable-300 bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-coral-300 hover:text-coral-700"
              >
                <MapPin className="h-4 w-4" />
                Choisir une ville
              </Link>
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <PetFilters />
        </Suspense>

        {catsList.length === 0 ? (
          <EmptyState
            className="mt-8"
            variant="illustrated"
            icon={<Search className="h-9 w-9" />}
            title="Aucun animal ne correspond à vos critères"
            hint="Essayez d'enlever un filtre, ou élargissez la recherche. De nouveaux profils sont publiés chaque semaine par les refuges partenaires."
            action={
              <Link href="/adopter/liste">
                <Button variant="outline">Réinitialiser les filtres</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="mt-4 mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {catsList.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  photo={photoMap.get(pet.id)}
                  isFavorite={userFavorites.has(pet.id)}
                  showFavorite={!!session}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/adopter/liste?${new URLSearchParams({ ...filterParams, page: String(page - 1) }).toString()}`}
                  >
                    <Button variant="outline" size="sm">
                      Précédent
                    </Button>
                  </Link>
                )}
                <span className="text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/adopter/liste?${new URLSearchParams({ ...filterParams, page: String(page + 1) }).toString()}`}
                  >
                    <Button variant="outline" size="sm">
                      Suivant
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
