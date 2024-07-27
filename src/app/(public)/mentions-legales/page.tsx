import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Informations légales relatives à l'éditeur du site Dorloter et à son hébergement.",
  robots: { index: true, follow: true },
};

/**
 * Page "mentions légales" obligatoire en France (loi LCEN n° 2004-575,
 * art. 6-III). À faire relire par un conseil juridique avant mise en ligne
 * publique — les crochets `[...]` marquent les informations à compléter.
 */
export default function MentionsLegalesPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          Mentions légales
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Éditeur du site</h2>
            <p>
              Le site <strong>dorloter.fr</strong> est édité par{" "}
              <strong>[Prénom NOM]</strong>, entrepreneur individuel, résidant à{" "}
              <strong>[adresse postale complète]</strong>.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>Email de contact : <a href="mailto:contact@dorloter.fr" className="text-coral-600 underline">contact@dorloter.fr</a></li>
              <li>Téléphone : [facultatif]</li>
              <li>SIRET : <strong>[numéro SIRET]</strong></li>
              <li>Directeur de la publication : <strong>[Prénom NOM]</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Hébergement</h2>
            <p>
              Le site est hébergé par <strong>OVH SAS</strong>, société
              française au capital de 50 000 000 €, immatriculée au RCS Lille
              Métropole sous le n° 424 761 419.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>Siège social : 2 rue Kellermann, 59100 Roubaix, France</li>
              <li>Téléphone : 1007 (service gratuit + prix d&apos;appel)</li>
              <li>Site web : <a href="https://www.ovh.com" target="_blank" rel="noopener noreferrer" className="text-coral-600 underline">ovh.com</a></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du site (structure, code source, graphismes,
              textes, logo) est la propriété de l&apos;éditeur, à l&apos;exception
              des contenus publiés par les utilisateurs (annonces d&apos;adoption,
              signalements, photos de chats) qui restent la propriété de leurs
              auteurs respectifs.
            </p>
            <p className="mt-2">
              Toute reproduction, représentation ou exploitation, totale ou
              partielle, de ce site sans autorisation préalable est interdite
              et constitue une contrefaçon (art. L.335-2 et s. du Code de la
              propriété intellectuelle).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Contenus utilisateurs</h2>
            <p>
              En publiant un contenu (annonce, signalement, photo, commentaire)
              sur Dorloter, l&apos;utilisateur accorde à la plateforme une licence
              non-exclusive d&apos;affichage et de diffusion publique, limitée
              à la durée de la publication et aux finalités du service
              (rapprochement d&apos;annonces, affichage public, matching
              perdu/trouvé).
            </p>
            <p className="mt-2">
              L&apos;utilisateur garantit disposer des droits sur les contenus
              qu&apos;il publie (photos notamment) et s&apos;engage à respecter
              les droits des tiers.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Signalement de contenus</h2>
            <p>
              Conformément à la loi pour la confiance dans l&apos;économie
              numérique, tout contenu manifestement illicite peut être signalé
              via le bouton <em>« Signaler »</em> présent sur chaque fiche, ou
              par email à{" "}
              <a href="mailto:signalement@dorloter.fr" className="text-coral-600 underline">
                signalement@dorloter.fr
              </a>
              . L&apos;éditeur s&apos;engage à traiter les signalements dans
              les meilleurs délais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Contact</h2>
            <p>
              Pour toute question relative à ces mentions, au fonctionnement
              du site ou à la sécurité :{" "}
              <a href="mailto:contact@dorloter.fr" className="text-coral-600 underline">
                contact@dorloter.fr
              </a>
              .
            </p>
          </section>

          <p className="pt-6 text-xs text-muted-foreground">
            Voir aussi :{" "}
            <Link href="/confidentialite" className="underline hover:text-foreground">
              Politique de confidentialité
            </Link>{" "}
            ·{" "}
            <Link href="/cgu" className="underline hover:text-foreground">
              Conditions d&apos;utilisation
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
