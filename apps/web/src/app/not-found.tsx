import Link from "next/link";
import { Compass, MapPin, PawPrint, Search } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { buttonVariants } from "@shared/ui/button";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16"
      >
        <div className="text-center">
          {/* Empreintes qui partent en cavale — bandeau visuel léger */}
          <div
            aria-hidden
            className="mb-6 flex items-center justify-center gap-2"
          >
            <PawPrint className="h-5 w-5 -rotate-12 text-coral-200" />
            <PawPrint className="h-6 w-6 rotate-3 text-coral-300" />
            <PawPrint className="h-7 w-7 -rotate-6 text-coral-400" />
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-coral-50">
              <Compass className="h-8 w-8 text-coral-500" />
            </span>
            <PawPrint className="h-7 w-7 rotate-12 text-coral-300" />
            <PawPrint className="h-6 w-6 -rotate-3 text-coral-200" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">
            404 · page introuvable
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Cette page s&apos;est perdue.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Un lien cassé, une URL mal tapée, ou une fiche retirée. Pas
            grave — il y a sûrement un compagnon qui vous attend ailleurs
            sur le site.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonVariants()}>
              Retour à l&apos;accueil
            </Link>
            <Link
              href="/adopter"
              className={buttonVariants({ variant: "outline" })}
            >
              <PawPrint className="mr-1.5 h-4 w-4" />
              Voir les animaux à adopter
            </Link>
            <Link
              href="/perdus-trouves"
              className={buttonVariants({ variant: "outline" })}
            >
              <MapPin className="mr-1.5 h-4 w-4" />
              Carte des signalements
            </Link>
          </div>

          <div className="mt-10 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <Search className="h-3 w-3" />
            Si vous tombez sur cette erreur depuis un lien interne,
            <Link
              href="mailto:hello@dorloter.fr"
              className="ml-1 font-medium text-coral-600 hover:underline"
            >
              dites-le nous
            </Link>
            .
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
