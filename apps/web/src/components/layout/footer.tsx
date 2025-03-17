import Link from "next/link";
import { PawPrint } from "lucide-react";
import { FooterQuote } from "./footer-quote";

export function Footer() {
  return (
    <footer className="border-t border-sable-200 bg-sable-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <Link
              href="/"
              className="flex items-center gap-1 text-lg font-extrabold tracking-tight text-foreground"
            >
              <PawPrint className="h-5 w-5 text-coral-500" />
              dorloter
            </Link>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              La plateforme française pour adopter un animal en refuge et
              signaler les perdus ou trouvés. Open source, gratuit, sans pub.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Aucun cookie tiers, aucune pub, données hébergées en France.
            </p>
          </div>

          <div className="flex flex-wrap gap-12 text-sm">
            <div>
              <p className="font-semibold text-foreground">Plateforme</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/adopter"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Adopter
                </Link>
                <Link
                  href="/avant-d-adopter"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Avant d&apos;adopter
                </Link>
                <Link
                  href="/temoignages"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Témoignages
                </Link>
                <Link
                  href="/evenements"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Événements
                </Link>
                <Link
                  href="/actualites"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Actualités
                </Link>
                <Link
                  href="/familles-accueil"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Devenir famille d&apos;accueil
                </Link>
                <Link
                  href="/perdus-trouves"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Perdus / Trouvés
                </Link>
                <Link
                  href="/refuges"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Refuges
                </Link>
                <Link
                  href="/pensions"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Pensions
                </Link>
                <Link
                  href="/veterinaires"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Vétérinaires
                </Link>
                <Link
                  href="/carte"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Carte de France
                </Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">Compte</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/register"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  S&apos;inscrire
                </Link>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Connexion
                </Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">Légal</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/mentions-legales"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Mentions légales
                </Link>
                <Link
                  href="/confidentialite"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Confidentialité
                </Link>
                <Link
                  href="/cgu"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  CGU
                </Link>
                <Link
                  href="/charte-refuges"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Charte refuges
                </Link>
                <Link
                  href="/verification"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Comment on vérifie
                </Link>
                <Link
                  href="/presse"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Espace presse
                </Link>
                <Link
                  href="/stats"
                  className="text-muted-foreground hover:text-coral-500"
                >
                  Chiffres
                </Link>
              </div>
            </div>
          </div>
        </div>

        <FooterQuote />

        <div className="mt-6 border-t border-sable-200 pt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Dorloter. Fait avec soin en France.
        </div>
      </div>
    </footer>
  );
}
