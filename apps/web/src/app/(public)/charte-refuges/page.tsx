import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Charte des refuges partenaires",
  description:
    "Les engagements des refuges qui publient sur Dorloter : éthique, transparence, bien-être animal.",
  robots: { index: true, follow: true },
};

export default function CharteRefugesPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Charte des refuges partenaires
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          En vigueur depuis le 17 avril 2026. S&apos;applique à tout refuge,
          association ou structure publiant des annonces d&apos;adoption sur
          Dorloter.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section className="rounded-xl border border-lavande-200 bg-lavande-50/40 p-4">
            <p className="font-medium">
              Dorloter n&apos;est pas une marketplace. Les refuges qui y
              publient s&apos;engagent sur une exigence commune : mettre le
              bien-être de l&apos;animal avant tout, transparence totale sur
              les conditions d&apos;adoption, respect strict de la
              réglementation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">1. Légitimité juridique</h2>
            <p>
              Le refuge doit être <strong>déclaré légalement</strong> (SIRET
              pour une association loi 1901, ou équivalent). Les structures
              sans existence juridique (particuliers qui revendent, élevages
              déguisés) ne sont pas autorisées sur Dorloter.
            </p>
            <p className="mt-2">
              Dorloter se réserve le droit de vérifier manuellement la
              déclaration et d&apos;attribuer (ou non) le badge{" "}
              <em>« Vérifié »</em> sur la fiche publique.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">2. Soins vétérinaires</h2>
            <p>Tout chat proposé à l&apos;adoption doit être :</p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>
                <strong>Identifié</strong> (puce électronique ou tatouage) au
                nom du refuge, conformément à l&apos;art. L.212-10 du Code
                rural
              </li>
              <li>
                <strong>Stérilisé</strong> s&apos;il est adulte (exceptions
                justifiées par écrit pour les chatons non-sevrés ou les
                raisons médicales)
              </li>
              <li>
                <strong>Vacciné</strong> (au minimum typhus et coryza)
              </li>
              <li>
                <strong>Testé FIV/FeLV</strong> · le résultat doit être
                mentionné honnêtement sur l&apos;annonce
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">3. Honnêteté des annonces</h2>
            <p>Chaque fiche doit refléter fidèlement :</p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>L&apos;âge estimé, le caractère, les besoins spécifiques</li>
              <li>
                Les compatibilités réelles (chats, chiens, enfants) · ne pas
                écrire <em>« oui »</em> par défaut
              </li>
              <li>Les antécédents médicaux connus</li>
              <li>Les traits comportementaux qui demandent une adoption ciblée</li>
            </ul>
            <p className="mt-2">
              Les photos doivent être récentes (moins de 6 mois) et
              représenter l&apos;animal réel, non des images génériques.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">4. Processus d&apos;adoption</h2>
            <p>
              Le refuge s&apos;engage à répondre à chaque candidature dans un
              délai <strong>raisonnable</strong> (7 jours maximum). Un
              refus n&apos;a pas besoin d&apos;être justifié, mais la
              candidature ne peut rester sans réponse.
            </p>
            <p className="mt-2">
              Un contrat d&apos;adoption écrit, conforme à la
              réglementation (art. L.214-8 Code rural), est signé entre
              refuge et adoptant, avec les engagements mutuels (suivi,
              reprise en cas de problème).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">5. Frais d&apos;adoption</h2>
            <p>
              Des frais d&apos;adoption peuvent être demandés (typiquement
              100 à 200 € pour couvrir l&apos;identification, la
              stérilisation, les vaccins). Ils doivent être :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>Affichés clairement sur la fiche</li>
              <li>Justifiables sur présentation</li>
              <li>Proportionnés aux frais réellement engagés</li>
            </ul>
            <p className="mt-2">
              Les frais disproportionnés ou destinés à dégager un profit sont
              un motif d&apos;exclusion de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">6. Pas de discrimination</h2>
            <p>
              Le refuge s&apos;engage à ne pas refuser une candidature sur
              des critères non pertinents (origine, religion, orientation,
              situation familiale, handicap). L&apos;évaluation doit porter
              exclusivement sur l&apos;adéquation entre le foyer proposé et
              les besoins spécifiques de l&apos;animal.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">7. Suivi post-adoption</h2>
            <p>
              Le refuge doit maintenir un canal de contact avec
              l&apos;adoptant pendant au minimum 6 mois après l&apos;adoption
              et accepter le retour de l&apos;animal sans condition si
              l&apos;adoption échoue · c&apos;est une obligation légale
              (art. L.214-6-3 Code rural) et une exigence éthique.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">8. Non-respect de la charte</h2>
            <p>
              Tout manquement constaté, directement ou via les signalements
              des utilisateurs, entraîne :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>Retrait du badge <em>« Vérifié »</em></li>
              <li>Avertissement écrit</li>
              <li>Suspension temporaire des publications</li>
              <li>Exclusion définitive en cas de récidive ou de faute grave</li>
            </ul>
            <p className="mt-2">
              En cas de suspicion de maltraitance, Dorloter transmettra
              l&apos;information à la DDPP (Direction départementale de la
              protection des populations) compétente.
            </p>
          </section>

          <p className="pt-6 text-xs text-muted-foreground">
            Une question sur cette charte ? Écrivez à{" "}
            <a
              href="mailto:refuges@dorloter.fr"
              className="text-coral-600 underline"
            >
              refuges@dorloter.fr
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground">
            Voir aussi :{" "}
            <Link
              href="/cgu"
              className="underline hover:text-foreground"
            >
              CGU
            </Link>{" "}
            ·{" "}
            <Link
              href="/confidentialite"
              className="underline hover:text-foreground"
            >
              Confidentialité
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
