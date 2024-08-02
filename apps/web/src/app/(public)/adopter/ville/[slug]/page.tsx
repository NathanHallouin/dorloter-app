import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Heart, MapPin } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { buttonVariants } from "@shared/ui/button";
import { PetCard } from "@adoption/public";
import { CITIES, getCityBySlug, cityInLocative } from "@shared/utils/cities";
import { getPetsNearPoint } from "@adoption/public";
import { getSheltersNearPoint } from "@shelters/public";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";
const RADIUS_KM = 30;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return { title: "Ville introuvable" };

  const locative = cityInLocative(city);
  const title = `Animaux à adopter ${locative}`;
  const description = `Les animaux à adopter dans les refuges partenaires ${locative} et dans un rayon de ${RADIUS_KM} km.`;
  const canonical = `${BASE_URL}/adopter/ville/${city.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
  };
}

export default async function AdopterVillePage({ params }: PageProps) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const [{ pets: catsRows, photoMap }, shelterRows] = await Promise.all([
    getPetsNearPoint(city.lat, city.lng, RADIUS_KM, 40),
    getSheltersNearPoint(city.lat, city.lng, RADIUS_KM, 10),
  ]);

  const locative = cityInLocative(city);
  const catCount = catsRows.length;
  const shelterCount = shelterRows.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Animaux à adopter ${locative}`,
    description: `${catCount} animaux à adopter ${locative} et aux alentours.`,
    url: `${BASE_URL}/adopter/ville/${city.slug}`,
    about: {
      "@type": "Place",
      name: city.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: city.name,
        addressCountry: "FR",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: city.lat,
        longitude: city.lng,
      },
    },
  };

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Breadcrumb */}
        <nav
          aria-label="Fil d'Ariane"
          className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href="/adopter" className="hover:text-foreground">
            Adopter
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/adopter/villes" className="hover:text-foreground">
            Par ville
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{city.name}</span>
        </nav>

        {/* Hero */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Animaux à adopter {locative}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {catCount > 0 ? (
                <>
                  <strong className="font-semibold text-foreground">
                    {catCount} {catCount > 1 ? "chats" : "chat"}
                  </strong>{" "}
                  {catCount > 1 ? "disponibles" : "disponible"} dans{" "}
                  <strong className="font-semibold text-foreground">
                    {shelterCount}{" "}
                    {shelterCount > 1 ? "refuges partenaires" : "refuge partenaire"}
                  </strong>{" "}
                  à moins de {RADIUS_KM} km de {city.name}.
                </>
              ) : (
                <>
                  Pas encore de refuge partenaire {locative}. La carte des
                  signalements reste utile pour un animal perdu ou trouvé dans la
                  zone.
                </>
              )}
            </p>
          </div>
          <Link
            href="/adopter"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Heart className="mr-2 h-4 w-4" />
            Voir tous les animaux
          </Link>
        </header>

        {/* Contenu SEO : blurb ville */}
        {city.blurb && (
          <section className="mb-10 max-w-3xl rounded-lg border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            {city.blurb}
          </section>
        )}

        {/* Refuges */}
        {shelterRows.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold">
              Refuges près de {city.name}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shelterRows.map(({ shelter, distanceMeters }) => (
                <li key={shelter.id}>
                  <Link
                    href={`/refuges/${shelter.slug}`}
                    className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-coral-300 hover:shadow-md"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-semibold group-hover:text-coral-700">
                          {shelter.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(distanceMeters / 1000).toFixed(1)} km
                        </span>
                      </div>
                      {shelter.address && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {shelter.address}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Grille de chats */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Les animaux disponibles {locative}
          </h2>

          {catsRows.length === 0 ? (
            <EmptyState
              title="Pas d'animal à l'adoption dans la zone pour le moment."
              hint="Vous pouvez élargir la recherche à toute la France."
              action={
                <Link
                  href="/adopter/liste"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Voir tous les animaux
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {catsRows.map(({ pet }) => {
                const url = photoMap.get(pet.id);
                return (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    photo={url ? { url } : null}
                    showFavorite={false}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Footer navigation villes */}
        <section className="mt-16 border-t border-border pt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Autres villes
          </h2>
          <div className="flex flex-wrap gap-2">
            {CITIES.filter((c) => c.slug !== city.slug)
              .slice(0, 16)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/adopter/ville/${c.slug}`}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground transition hover:border-coral-300 hover:text-coral-700"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
