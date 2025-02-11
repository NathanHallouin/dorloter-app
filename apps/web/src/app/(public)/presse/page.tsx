import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileText,
  Mail,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getGlobalAdoptionStats } from "@adoption/public";
import { getGlobalReportStats } from "@lost-found/public";
import { getGlobalShelterStats } from "@shelters/public";
import { getGlobalPensionStats } from "@pensions/public";
import { getGlobalVetStats } from "@veterinarians/public";

export const metadata: Metadata = {
  title: "Espace presse",
  description:
    "Logos, charte graphique, chiffres clés et contact presse pour la couverture médiatique de Dorloter, plateforme française d'adoption et de retrouvailles d'animaux.",
  alternates: { canonical: "/presse" },
  openGraph: {
    title: "Espace presse · Dorloter",
    description:
      "Kit média Dorloter : logos, palette de couleurs, chiffres clés, tonalité éditoriale et contact presse.",
    url: "/presse",
    type: "website",
  },
};

// Refresh quotidien suffisant pour des chiffres communiqués à la presse
export const revalidate = 86400;

interface LogoVariant {
  href: string;
  label: string;
  description: string;
  bgClass: string;
  filterClass?: string;
}

const LOGOS: LogoVariant[] = [
  {
    href: "/press-kit/logo-dorloter-couleur.svg",
    label: "Logo couleur",
    description: "Sur fond clair, format paysage. Coral + noir.",
    bgClass: "bg-sable-50 border-border",
  },
  {
    href: "/press-kit/logo-dorloter-noir.svg",
    label: "Logo monochrome noir",
    description: "Pour print et fonds clairs uni-couleur.",
    bgClass: "bg-white border-border",
  },
  {
    href: "/press-kit/logo-dorloter-blanc.svg",
    label: "Logo monochrome blanc",
    description: "Pour fond foncé (preview sur fond prune).",
    bgClass: "bg-prune-800 border-prune-900",
  },
  {
    href: "/press-kit/picto-patte.svg",
    label: "Picto seul",
    description: "Patte coral seule, sans le texte. Favicon, badge…",
    bgClass: "bg-sable-50 border-border",
  },
];

interface ColorSwatch {
  name: string;
  hex: string;
  use: string;
  textClass: string;
  bgClass: string;
}

const PALETTE: ColorSwatch[] = [
  {
    name: "Coral 500",
    hex: "#e8634d",
    use: "Couleur primaire · accents, CTA principaux",
    textClass: "text-white",
    bgClass: "bg-coral-500",
  },
  {
    name: "Lavande 500",
    hex: "#8b72c2",
    use: "Accent doux · espaces secondaires, refuge",
    textClass: "text-white",
    bgClass: "bg-lavande-500",
  },
  {
    name: "Sable 50",
    hex: "#faf9f6",
    use: "Fond chaleureux principal",
    textClass: "text-sable-900",
    bgClass: "bg-sable-50 border border-sable-300",
  },
  {
    name: "Prune 800",
    hex: "#432b40",
    use: "Texte profond · accent admin",
    textClass: "text-white",
    bgClass: "bg-prune-800",
  },
  {
    name: "Teal 600",
    hex: "#0d9488",
    use: "Accent vétérinaire / santé",
    textClass: "text-white",
    bgClass: "bg-teal-600",
  },
  {
    name: "Foreground",
    hex: "#1f1414",
    use: "Texte principal",
    textClass: "text-white",
    bgClass: "bg-[#1f1414]",
  },
];

export default async function PressePage() {
  const [adoption, reports, shelters, pensions, vets] = await Promise.all([
    getGlobalAdoptionStats(),
    getGlobalReportStats(),
    getGlobalShelterStats(),
    getGlobalPensionStats(),
    getGlobalVetStats(),
  ]);

  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:py-14"
      >
        {/* Hero */}
        <header className="mb-12 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-coral-700">
            <FileText className="h-3 w-3" />
            Espace presse
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Le kit média Dorloter
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Logos, palette graphique, chiffres clés et tonalité pour parler
            de Dorloter dans vos articles, reportages ou réseaux sociaux.
            Tous les visuels sont libres de droits dans le cadre d&apos;une
            couverture éditoriale.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-foreground">
            <Mail className="h-4 w-4 text-coral-500" />
            Contact presse :{" "}
            <a
              href="mailto:presse@dorloter.fr"
              className="font-semibold text-coral-700 underline-offset-4 hover:underline"
            >
              presse@dorloter.fr
            </a>
          </p>
        </header>

        {/* Chiffres clés */}
        <section
          aria-labelledby="stats-title"
          className="mb-14 rounded-2xl border border-border bg-card p-6 md:p-8"
        >
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2
              id="stats-title"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Chiffres clés en temps réel
            </h2>
            <p className="text-xs text-muted-foreground">
              Mis à jour quotidiennement
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat
              value={adoption.available}
              label={`animaux à adopter${adoption.cats || adoption.dogs ? ` (${adoption.cats} chat${adoption.cats > 1 ? "s" : ""} · ${adoption.dogs} chien${adoption.dogs > 1 ? "s" : ""})` : ""}`}
            />
            <Stat
              value={adoption.adoptedTotal}
              label="adoptions facilitées depuis le lancement"
            />
            <Stat
              value={reports.active}
              label={`signalements actifs (${reports.perdus} perdus · ${reports.trouves} trouvés)`}
            />
            <Stat
              value={reports.resolvedTotal}
              label="retrouvailles confirmées par la communauté"
            />
            <Stat
              value={shelters.verified}
              label={`refuges vérifiés${shelters.total > shelters.verified ? ` (${shelters.total - shelters.verified} en attente)` : ""}`}
            />
            <Stat
              value={pensions.verified + vets.verified}
              label={`pros agréés (${pensions.verified} pensions · ${vets.verified} vétérinaires)`}
            />
          </div>
        </section>

        {/* Mission + tonalité */}
        <section className="mb-14 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-2 text-xl font-bold text-foreground">
              Notre mission
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Dorloter est une plateforme française et indépendante pour
              <strong className="text-foreground"> adopter</strong> un animal
              en refuge, <strong className="text-foreground">retrouver</strong>{" "}
              un compagnon perdu grâce à un réseau géolocalisé, et{" "}
              <strong className="text-foreground">prendre soin</strong> via un
              annuaire de pensions et de vétérinaires vérifiés. Open source,
              gratuit, sans publicité, hébergé en Europe.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-2 text-xl font-bold text-foreground">
              Tonalité éditoriale
            </h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Chaleureuse</strong> : on
                parle de compagnons, pas de marchandise.
              </li>
              <li>
                <strong className="text-foreground">Pragmatique</strong> : pas
                de promesses miracles, des outils concrets.
              </li>
              <li>
                <strong className="text-foreground">Souveraine</strong> :
                hébergement et services européens, pas d&apos;AWS, pas de
                Google.
              </li>
              <li>
                <strong className="text-foreground">Honnête</strong> : open
                source, pas de monétisation cachée, pas de vente de données.
              </li>
            </ul>
          </article>
        </section>

        {/* Logos */}
        <section
          aria-labelledby="logos-title"
          className="mb-14"
        >
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="logos-title"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Logos
            </h2>
            <p className="text-xs text-muted-foreground">
              SVG · libre de droits pour usage éditorial
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {LOGOS.map((logo) => (
              <article
                key={logo.href}
                className={`flex flex-col overflow-hidden rounded-2xl border ${logo.bgClass}`}
              >
                <div className="flex items-center justify-center px-6 py-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.href}
                    alt={logo.label}
                    className="max-h-24 w-auto"
                  />
                </div>
                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {logo.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {logo.description}
                    </p>
                  </div>
                  <a
                    href={logo.href}
                    download
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-coral-600"
                  >
                    <Download className="h-3 w-3" />
                    SVG
                  </a>
                </footer>
              </article>
            ))}
          </div>
        </section>

        {/* Palette */}
        <section aria-labelledby="palette-title" className="mb-14">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="palette-title"
              className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground"
            >
              <Palette className="h-5 w-5 text-coral-500" />
              Palette
            </h2>
            <p className="text-xs text-muted-foreground">
              Codes hexadécimaux officiels
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PALETTE.map((color) => (
              <div
                key={color.name}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div
                  className={`flex h-24 items-end p-3 ${color.bgClass}`}
                  aria-hidden
                >
                  <code className={`text-xs font-bold ${color.textClass}`}>
                    {color.hex}
                  </code>
                </div>
                <div className="space-y-1 p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {color.name}
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {color.use}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mentions et règles d'usage */}
        <section className="mb-14 rounded-2xl border border-coral-200 bg-coral-50/50 p-6 md:p-8">
          <h2 className="mb-3 inline-flex items-center gap-2 text-xl font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-coral-600" />
            Règles d&apos;usage
          </h2>
          <ul className="space-y-2 text-sm text-foreground/90">
            <li>
              ✓ Vous pouvez utiliser le logo Dorloter dans tout article,
              vidéo, podcast, reportage ou publication éditoriale.
            </li>
            <li>
              ✓ Conservez les proportions originales du logo, n&apos;ajoutez
              pas d&apos;effets (ombre, dégradé, contour).
            </li>
            <li>
              ✓ Préférez les versions monochromes pour le print.
            </li>
            <li>
              ✗ N&apos;utilisez pas le logo pour suggérer un partenariat,
              une affiliation ou un soutien officiel sans accord écrit.
            </li>
            <li>
              ✗ Ne modifiez ni le mot &laquo;&nbsp;dorloter&nbsp;&raquo;, ni la
              proportion ou la position de la patte.
            </li>
          </ul>
        </section>

        {/* Communiqués (vide pour l'instant) */}
        <section aria-labelledby="press-releases-title" className="mb-14">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="press-releases-title"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Communiqués
            </h2>
            <p className="text-xs text-muted-foreground">
              Aucun communiqué publié pour le moment
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-sable-50/30 p-8 text-center text-sm text-muted-foreground">
            Les prochains communiqués officiels Dorloter seront publiés ici
            et envoyés aux journalistes inscrits.{" "}
            <a
              href="mailto:presse@dorloter.fr?subject=Inscription%20liste%20presse%20Dorloter"
              className="font-medium text-coral-700 underline-offset-4 hover:underline"
            >
              Demandez à recevoir nos communiqués
            </a>
            .
          </div>
        </section>

        {/* Contact + liens utiles */}
        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 inline-flex items-center gap-2 text-xl font-bold text-foreground">
              <Mail className="h-5 w-5 text-coral-500" />
              Contact presse
            </h2>
            <p className="text-sm text-muted-foreground">
              Pour toute demande d&apos;interview, de visuels supplémentaires
              ou d&apos;informations sur la plateforme, écrivez à&nbsp;:
            </p>
            <a
              href="mailto:presse@dorloter.fr"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600"
            >
              <Mail className="h-4 w-4" />
              presse@dorloter.fr
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              Réponse sous 48h ouvrées.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-xl font-bold text-foreground">
              Liens utiles
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-foreground hover:text-coral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Page d&apos;accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/charte-refuges"
                  className="inline-flex items-center gap-1.5 text-foreground hover:text-coral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Charte des refuges
                </Link>
              </li>
              <li>
                <Link
                  href="/verification"
                  className="inline-flex items-center gap-1.5 text-foreground hover:text-coral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Méthode de vérification des partenaires
                </Link>
              </li>
              <li>
                <Link
                  href="/mentions-legales"
                  className="inline-flex items-center gap-1.5 text-foreground hover:text-coral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Mentions légales
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/NathanHallouin/miaou"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-foreground hover:text-coral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Code source sur GitHub
                </a>
              </li>
            </ul>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-3xl font-extrabold tabular-nums text-foreground">
        {value.toLocaleString("fr-FR")}
      </div>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
