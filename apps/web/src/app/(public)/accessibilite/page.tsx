import type { Metadata } from "next";
import Link from "next/link";
import { Accessibility, CheckCircle2, Mail } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Déclaration d'accessibilité",
  description:
    "Engagement et niveau de conformité de Dorloter au Référentiel général d'amélioration de l'accessibilité (RGAA 4.1). Méthodologie d'évaluation, dérogations connues et contact.",
  alternates: { canonical: "/accessibilite" },
};

const PUBLISHED_AT = "2026-06-01";

export default function AccessibilityPage() {
  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12"
      >
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700">
            <Accessibility className="h-3.5 w-3.5" />
            RGAA 4.1
          </div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Déclaration d&apos;accessibilité
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Mise à jour le{" "}
            <time dateTime={PUBLISHED_AT}>
              {new Date(PUBLISHED_AT).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </p>
        </header>

        <article className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:font-bold prose-headings:text-foreground prose-a:text-coral-600 prose-a:underline prose-strong:text-foreground">
          <section>
            <h2>Engagement</h2>
            <p>
              Dorloter s&apos;engage à rendre son service numérique
              accessible conformément à l&apos;article 47 de la loi n°
              2005-102 du 11 février 2005. À cette fin, nous mettons en
              œuvre la stratégie et les actions suivantes : prise en
              compte des critères du Référentiel général
              d&apos;amélioration de l&apos;accessibilité (RGAA 4.1) dès
              la conception, audits internes réguliers, correctifs
              prioritaires sur les parcours critiques (catalogue
              d&apos;adoption, signalements perdus-trouvés, candidatures).
            </p>
          </section>

          <section>
            <h2>État de conformité</h2>
            <p>
              Le site dorloter.fr est{" "}
              <strong>partiellement conforme</strong> au RGAA 4.1. La
              non-conformité s&apos;explique principalement par certaines
              cartes interactives MapLibre dont les contenus dynamiques ne
              sont pas tous restitués aux technologies d&apos;assistance,
              et par la consultation de photos d&apos;animaux dont les
              descriptions alternatives sont fournies par les refuges et
              dépendent de leur saisie.
            </p>
            <p>
              Le présent projet a fait l&apos;objet d&apos;une auto-évaluation
              interne (pas d&apos;audit RGAA externe à ce stade). Le
              niveau de conformité déclaré sera mis à jour après audit
              certifié.
            </p>
          </section>

          <section>
            <h2>Contenus rendus accessibles</h2>
            <ul>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Skip link « Aller au contenu » présent sur toutes les
                pages.
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Structure sémantique HTML5 avec landmarks (header,
                main, nav, footer, aside, section).
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Navigation au clavier intégrale (boutons, liens, formulaires).
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Focus visible sur tous les éléments interactifs.
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Respect de <code>prefers-reduced-motion</code> : les
                animations Motion et transitions hover sont désactivées
                pour les utilisateurs ayant désactivé les animations dans
                leur système.
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Contrastes texte / fond conformes WCAG AA sur les
                composants standards (texte primaire ≥ 4.5:1).
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Libellés explicites <code>aria-label</code> sur les boutons
                icon-only.
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Formulaires avec libellés <code>&lt;label&gt;</code>{" "}
                associés, messages d&apos;erreur explicites en cas de
                refus de validation.
              </li>
              <li>
                <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />{" "}
                Page rédigée en français, langue déclarée
                <code>lang=&quot;fr&quot;</code> sur le document.
              </li>
            </ul>
          </section>

          <section>
            <h2>Non-conformités connues</h2>
            <ul>
              <li>
                Cartes interactives MapLibre : les marqueurs et popups ne
                sont pas tous accessibles au lecteur d&apos;écran. Une
                version textuelle alternative (liste des points) est en
                cours d&apos;intégration sur les pages concernées
                (<Link href="/carte">/carte</Link>,{" "}
                <Link href="/perdus-trouves">/perdus-trouves</Link>).
              </li>
              <li>
                Photos d&apos;animaux : les textes alternatifs sont
                fournis par les refuges via le formulaire de saisie.
                Lorsque non remplis, l&apos;attribut <code>alt</code>{" "}
                reste vide pour ne pas inventer de description. Nous
                accompagnons les refuges sur cette bonne pratique.
              </li>
              <li>
                Composants tiers (lecteur audio, captcha Cloudflare
                Turnstile) : conformité dépendante des éditeurs.
              </li>
            </ul>
          </section>

          <section>
            <h2>Technologies utilisées</h2>
            <p>
              Next.js 16 (React 19), Tailwind CSS v4, shadcn/ui,
              MapLibre GL JS, Motion. Tests manuels au clavier (Tab,
              Shift+Tab, Enter, Espace, Échap), test de lecture VoiceOver
              (macOS) et NVDA (Windows) sur les parcours critiques.
            </p>
          </section>

          <section>
            <h2>Contact et défenseur des droits</h2>
            <p>
              Si vous constatez un défaut d&apos;accessibilité vous
              empêchant d&apos;accéder à un contenu ou une fonctionnalité,
              merci de nous le signaler en précisant la page concernée et
              le moyen d&apos;assistance utilisé. Nous vous répondrons sous
              15 jours ouvrés.
            </p>
            <p>
              <Mail className="inline h-4 w-4 text-coral-500" /> Email :{" "}
              <a href="mailto:accessibilite@dorloter.fr">
                accessibilite@dorloter.fr
              </a>
            </p>
            <p>
              Si vous n&apos;obtenez pas de réponse rapide, vous êtes en
              droit de faire parvenir vos doléances ou demandes de saisine
              au Défenseur des droits.
            </p>
            <ul>
              <li>
                <a
                  href="https://formulaire.defenseurdesdroits.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Formulaire en ligne
                </a>
              </li>
              <li>
                Par courrier : Défenseur des droits, Libre réponse 71120,
                75342 Paris CEDEX 07.
              </li>
            </ul>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
