import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CITIES } from "@shared/utils/cities";
import { countPetsNearPoint } from "@adoption/public";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

export const metadata: Metadata = {
  title: "Adopter un animal par ville",
  description:
    "Les animaux à adopter dans les principales villes françaises : Paris, Lyon, Marseille, Toulouse, Nice, Nantes… et toutes les autres.",
  alternates: {
    canonical: `${BASE_URL}/adopter/villes`,
  },
};

// Revalide la page toutes les heures pour que les compteurs restent frais
// sans taper la DB à chaque visite.
export const revalidate = 3600;

export default async function AdopterVillesPage() {
  // Compteurs en parallèle (25 requêtes mais chaque requête est légère grâce
  // aux index GIST sur shelters.location)
  const counts = await Promise.all(
    CITIES.map((city) =>
      countPetsNearPoint(city.lat, city.lng, 30).then((n) => ({
        city,
        count: n,
      }))
    )
  );

  // Tri : villes avec le plus de chats d'abord
  counts.sort((a, b) => b.count - a.count);
  const total = counts.reduce((acc, x) => acc + x.count, 0);

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Adopter un animal par ville
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Parcourez les {CITIES.length} principales villes de France.
            {total > 0 && (
              <>
                {" "}
                <strong className="font-semibold text-foreground">
                  {total} chats
                </strong>{" "}
                recensés au total dans les refuges partenaires.
              </>
            )}
          </p>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map(({ city, count }) => (
            <li key={city.slug}>
              <Link
                href={`/adopter/ville/${city.slug}`}
                className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition hover:border-coral-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600 transition group-hover:bg-coral-100">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-foreground">
                    {city.name}
                    {city.department && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {city.department}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {count === 0
                      ? "Aucun refuge partenaire"
                      : `${count} chat${count > 1 ? "s" : ""} à adopter`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
