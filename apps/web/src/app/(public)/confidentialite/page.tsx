import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment Dorloter collecte, utilise et protège vos données personnelles, en conformité avec le RGPD.",
  robots: { index: true, follow: true },
};

/**
 * Politique de confidentialité — exigence RGPD (art. 13/14 règlement
 * UE 2016/679). À faire relire par un conseil juridique / DPO avant
 * mise en ligne publique.
 */
export default function ConfidentialitePage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Politique de confidentialité
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Dernière mise à jour : 17 avril 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold">En résumé</h2>
            <ul className="list-inside list-disc space-y-1 rounded-lg border border-border bg-muted/30 p-4">
              <li>
                Nous ne vendons <strong>jamais</strong> vos données, ni ne les
                partageons à des fins publicitaires.
              </li>
              <li>
                Nous n&apos;utilisons <strong>aucun cookie tiers</strong> (pas
                de Google Analytics, pas de pixel Facebook).
              </li>
              <li>
                Vos données sont stockées en <strong>France ou en UE</strong>{" "}
                (OVH, Roubaix).
              </li>
              <li>
                Vous pouvez exporter ou supprimer vos données à tout moment
                depuis{" "}
                <Link href="/profil" className="text-coral-600 underline">
                  votre profil
                </Link>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Responsable du traitement</h2>
            <p>
              L&apos;éditeur de Dorloter, identifié dans les{" "}
              <Link href="/mentions-legales" className="underline">
                mentions légales
              </Link>
              , est responsable du traitement de vos données personnelles au
              sens du RGPD. Contact :{" "}
              <a href="mailto:privacy@dorloter.fr" className="text-coral-600 underline">
                privacy@dorloter.fr
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Données collectées</h2>

            <h3 className="mt-3 font-semibold">Compte utilisateur</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>Email (obligatoire pour l&apos;authentification)</li>
              <li>Nom (affiché publiquement)</li>
              <li>Mot de passe (haché, jamais stocké en clair)</li>
              <li>Téléphone (facultatif, pour joindre un signaleur)</li>
              <li>
                Localisation approximative (facultatif, uniquement si vous
                l&apos;activez pour recevoir des alertes de proximité)
              </li>
            </ul>

            <h3 className="mt-3 font-semibold">Contenus publiés</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>
                Signalements perdu/trouvé (photos, description, lieu, date,
                coordonnées de contact)
              </li>
              <li>Candidatures d&apos;adoption (motivations, logement, expérience)</li>
              <li>Favoris et refuges suivis</li>
            </ul>

            <h3 className="mt-3 font-semibold">Données techniques</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>
                Adresse IP (conservée temporairement pour le rate-limiting et
                la sécurité — jamais de profilage publicitaire)
              </li>
              <li>
                User-Agent du navigateur (stocké avec la session pour afficher
                les appareils connectés)
              </li>
              <li>
                Horodatage de création et de dernière modification de chaque
                objet
              </li>
              <li>
                Souscription Web Push si vous avez activé les notifications
                (ne contient pas votre identité, juste un token anonyme)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Finalités et bases légales</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Traitement</th>
                  <th className="py-2 pr-3">Base légale</th>
                  <th className="py-2">Conservation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-3">Compte + authentification</td>
                  <td className="py-2 pr-3">Exécution du contrat</td>
                  <td className="py-2">Durée d&apos;activité du compte</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Publication d&apos;annonces</td>
                  <td className="py-2 pr-3">Exécution du contrat</td>
                  <td className="py-2">60 jours après résolution ou expiration</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Notifications (push + email)</td>
                  <td className="py-2 pr-3">Consentement (push) ; exécution du contrat (email)</td>
                  <td className="py-2">Révocable à tout moment</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Localisation pour alertes</td>
                  <td className="py-2 pr-3">Consentement explicite</td>
                  <td className="py-2">Révocable à tout moment</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Rate-limiting par IP</td>
                  <td className="py-2 pr-3">Intérêt légitime (sécurité)</td>
                  <td className="py-2">1 heure</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Logs d&apos;actions sensibles</td>
                  <td className="py-2 pr-3">Intérêt légitime (audit, modération)</td>
                  <td className="py-2">12 mois</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Destinataires des données</h2>
            <p>
              Vos données ne sont partagées qu&apos;avec les prestataires
              strictement nécessaires au fonctionnement du service, tous
              situés en Union européenne :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>
                <strong>OVH</strong> (France) — hébergement VPS, base de
                données, stockage des photos
              </li>
              <li>
                <strong>Resend</strong> (Delaware, USA — clauses
                contractuelles types appliquées) — envoi des emails
                transactionnels (vérification, reset password, notifications)
              </li>
              <li>
                <strong>MapTiler</strong> (Suisse) — affichage des cartes.
                Votre IP est vue par MapTiler mais aucun profilage n&apos;est
                fait.
              </li>
            </ul>
            <p className="mt-2">
              Aucune donnée n&apos;est transférée hors UE sans garanties
              appropriées (clauses contractuelles types).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Cookies</h2>
            <p>
              Dorloter utilise <strong>uniquement des cookies techniques
              strictement nécessaires</strong> au fonctionnement du site :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>
                Cookie de session (Better Auth) — expire après 7 jours
                d&apos;inactivité
              </li>
              <li>Préférence de thème (clair / sombre)</li>
            </ul>
            <p className="mt-2">
              Aucun cookie publicitaire, aucun tracking tiers, aucune analyse
              comportementale. Conformément à la jurisprudence CNIL, ces
              cookies techniques ne nécessitent pas votre consentement
              préalable.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Vos droits</h2>
            <p>Vous disposez en permanence des droits suivants :</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong>Accès</strong> : consulter les données qu&apos;on
                détient sur vous → bouton{" "}
                <em>« Exporter mes données »</em> dans{" "}
                <Link href="/profil" className="text-coral-600 underline">
                  votre profil
                </Link>
              </li>
              <li>
                <strong>Rectification</strong> : modifier vos informations
                directement depuis le profil
              </li>
              <li>
                <strong>Effacement (« droit à l&apos;oubli »)</strong> :
                supprimer votre compte et toutes les données associées →
                bouton dans le profil, effet immédiat
              </li>
              <li>
                <strong>Portabilité</strong> : l&apos;export fournit un JSON
                structuré et réutilisable
              </li>
              <li>
                <strong>Opposition</strong> : désactiver les notifications
                depuis le profil
              </li>
              <li>
                <strong>Réclamation</strong> : vous pouvez saisir la CNIL si
                vous estimez que vos droits ne sont pas respectés —{" "}
                <a
                  href="https://www.cnil.fr/fr/plaintes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-coral-600 underline"
                >
                  cnil.fr/plaintes
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Sécurité</h2>
            <p>
              Nous appliquons plusieurs couches de défense pour protéger vos
              données : chiffrement TLS 1.3 en transit, mots de passe hachés
              (bcrypt), rôles Postgres à privilèges restreints, rate-limiting
              par IP, journalisation des actions sensibles. En cas de
              violation de données, nous notifierons la CNIL dans les 72h et
              les utilisateurs concernés sans délai.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Modifications</h2>
            <p>
              Cette politique peut évoluer. Toute modification substantielle
              sera notifiée par email aux utilisateurs connectés et fera
              l&apos;objet d&apos;une bannière sur le site. La version en
              vigueur est toujours celle affichée sur cette page.
            </p>
          </section>

          <p className="pt-6 text-xs text-muted-foreground">
            Voir aussi :{" "}
            <Link href="/mentions-legales" className="underline hover:text-foreground">
              Mentions légales
            </Link>{" "}
            ·{" "}
            <Link href="/cgu" className="underline hover:text-foreground">
              CGU
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
