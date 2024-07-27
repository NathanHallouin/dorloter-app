import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Règles d'utilisation de la plateforme Dorloter : publication d'annonces, comportement, responsabilités.",
  robots: { index: true, follow: true },
};

/**
 * CGU — à faire relire par un conseil juridique avant mise en ligne publique.
 * Contenu inspiré des obligations LCEN, RGPD, et du Code de la consommation.
 */
export default function CGUPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Conditions générales d&apos;utilisation
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Version du 17 avril 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold">1. Objet</h2>
            <p>
              Dorloter est une plateforme française à but non lucratif qui met en
              relation :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>
                des <strong>refuges et associations</strong> proposant des
                chats à l&apos;adoption
              </li>
              <li>
                des <strong>particuliers</strong> souhaitant adopter
              </li>
              <li>
                des <strong>personnes</strong> ayant perdu ou trouvé un chat
              </li>
            </ul>
            <p className="mt-2">
              Les présentes CGU régissent l&apos;utilisation du site{" "}
              <strong>dorloter.fr</strong> et de tous ses services associés.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">2. Acceptation</h2>
            <p>
              L&apos;inscription sur Dorloter vaut acceptation pleine et entière
              des présentes CGU, de la{" "}
              <Link href="/confidentialite" className="underline">
                politique de confidentialité
              </Link>{" "}
              et, pour les refuges, de la{" "}
              <Link href="/charte-refuges" className="underline">
                charte des refuges partenaires
              </Link>
              . Toute modification sera notifiée par email.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">3. Gratuité du service</h2>
            <p>
              L&apos;accès et l&apos;utilisation de Dorloter sont{" "}
              <strong>gratuits</strong>, sans publicité ni frais cachés. Les
              refuges ne paient aucune commission sur les adoptions. La
              plateforme ne prélève aucun pourcentage sur les frais
              d&apos;adoption éventuels demandés par les refuges.
            </p>
            <p className="mt-2">
              Des dons volontaires peuvent soutenir l&apos;infrastructure,
              sans contrepartie autre que l&apos;existence du service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">4. Inscription</h2>
            <p>
              L&apos;inscription est ouverte à toute personne physique
              majeure (ou mineure avec l&apos;accord d&apos;un représentant
              légal) ou à toute personne morale (refuge, association).
              L&apos;utilisateur s&apos;engage à fournir des informations
              exactes et à les maintenir à jour.
            </p>
            <p className="mt-2">
              Un seul compte par personne. L&apos;éditeur se réserve le droit
              de suspendre un compte en cas de manquement constaté.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">5. Règles de publication</h2>
            <p>Il est <strong>interdit</strong> de publier :</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Du contenu faux, mensonger ou trompeur (faux signalement,
                photo d&apos;un autre animal, annonce fictive)
              </li>
              <li>
                Des annonces de vente payante d&apos;animaux (Dorloter est
                exclusivement dédié à l&apos;adoption via refuge ou au
                signalement perdu/trouvé)
              </li>
              <li>
                Des contenus à caractère haineux, discriminatoire, violent,
                pornographique, diffamatoire ou portant atteinte à la vie
                privée d&apos;autrui
              </li>
              <li>
                Des photos ou contenus dont vous ne détenez pas les droits
              </li>
              <li>
                Des coordonnées ou informations personnelles d&apos;un tiers
                sans son consentement
              </li>
              <li>
                Des liens ou contenus à visée publicitaire non autorisés
              </li>
            </ul>
            <p className="mt-2">
              Tout contenu en violation de ces règles pourra être retiré sans
              préavis. Les comptes récidivistes seront suspendus.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">6. Modération</h2>
            <p>
              Chaque utilisateur peut signaler un contenu via le bouton{" "}
              <em>« Signaler »</em>. Au-delà de 5 signalements distincts, un
              contenu peut être automatiquement masqué. Les signalements
              contre un refuge ou un utilisateur sont soumis à validation
              humaine.
            </p>
            <p className="mt-2">
              Les décisions de modération peuvent être contestées par email à{" "}
              <a
                href="mailto:moderation@dorloter.fr"
                className="text-coral-600 underline"
              >
                moderation@dorloter.fr
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">7. Responsabilité</h2>
            <p>
              Dorloter est un <strong>intermédiaire technique</strong> au sens
              de l&apos;article 6 de la LCEN. La plateforme ne vérifie pas a
              priori les contenus publiés par les utilisateurs et ne peut
              être tenue pour responsable :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>De l&apos;exactitude des annonces</li>
              <li>Des transactions entre utilisateurs</li>
              <li>Du comportement des chats adoptés</li>
              <li>D&apos;un manquement d&apos;un refuge à ses obligations</li>
            </ul>
            <p className="mt-2">
              L&apos;adoption reste un engagement direct entre adoptant et
              refuge. Dorloter recommande de toujours rencontrer l&apos;animal
              et les responsables avant de s&apos;engager, et de vérifier
              l&apos;identification (puce, passeport).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">8. Disponibilité</h2>
            <p>
              Dorloter est fourni <em>« en l&apos;état »</em>. L&apos;éditeur
              s&apos;efforce de maintenir un taux de disponibilité élevé mais
              ne garantit pas un accès ininterrompu. Des interruptions de
              service peuvent survenir pour maintenance ou pour des causes
              indépendantes de la volonté de l&apos;éditeur.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">9. Résiliation</h2>
            <p>
              L&apos;utilisateur peut supprimer son compte à tout moment
              depuis son profil. Toutes les données associées sont alors
              purgées sans délai (cf.{" "}
              <Link href="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              ).
            </p>
            <p className="mt-2">
              L&apos;éditeur peut suspendre ou résilier un compte en cas de
              violation des CGU, après notification lorsque possible.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">10. Droit applicable</h2>
            <p>
              Les présentes CGU sont soumises au droit français. Tout litige
              relatif à leur interprétation ou à leur exécution relève de la
              compétence des tribunaux français. Conformément au Code de la
              consommation, le consommateur peut recourir gratuitement à un
              médiateur de la consommation avant toute action en justice.
            </p>
          </section>

          <p className="pt-6 text-xs text-muted-foreground">
            Voir aussi :{" "}
            <Link href="/mentions-legales" className="underline hover:text-foreground">
              Mentions légales
            </Link>{" "}
            ·{" "}
            <Link href="/confidentialite" className="underline hover:text-foreground">
              Confidentialité
            </Link>{" "}
            ·{" "}
            <Link href="/charte-refuges" className="underline hover:text-foreground">
              Charte des refuges
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
