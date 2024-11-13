import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Eye,
  FileCheck2,
  Mail,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Comment on vérifie",
  description:
    "Le détail du processus de vérification des refuges et pensions sur Dorloter : SIRET, agrément préfecture, contact direct, badge « Vérifié ». Pas de boîtes noires.",
  alternates: { canonical: "/verification" },
  openGraph: {
    title: "Comment Dorloter vérifie ses partenaires",
    description:
      "SIRET contrôlés, agréments préfecture, contact humain · voici exactement comment on attribue le badge « Vérifié ».",
    url: "/verification",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Comment Dorloter vérifie",
    description:
      "Le détail du processus de vérification · sans jargon, sans boîte noire.",
  },
};

const SHELTER_STEPS = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Création d'un compte refuge",
    body: "L'équipe d'un refuge ou d'une association déclare la structure : nom, adresse, SIRET, contact, photos, mission. La fiche est créée mais pas encore visible publiquement.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Contrôle SIRET",
    body: "On vérifie que le SIRET déclaré correspond bien à une association loi 1901 ou à une structure légale active dans le répertoire INSEE. Pas de SIRET → pas de fiche publique.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Vérification de l'agrément",
    body: "Pour les refuges qui hébergent des animaux, on contrôle l'existence d'un certificat de capacité ou d'une déclaration en préfecture (selon l'effectif). On ne référence ni les éleveurs déguisés en refuge, ni les structures sans cadre légal.",
  },
  {
    icon: <Phone className="h-5 w-5" />,
    title: "Contact humain",
    body: "Un humain de l'équipe Dorloter appelle ou écrit au refuge pour valider les coordonnées et s'assurer que la fiche correspond à la réalité du terrain. Cinq minutes qui évitent énormément de faux profils.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Attribution du badge « Vérifié »",
    body: "Une fois ces étapes validées, le badge vert « Vérifié par Dorloter » est attribué et la fiche apparaît dans l'annuaire public. Sans ce badge, la fiche reste invisible.",
  },
];

const PENSION_STEPS = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Profil professionnel uniquement",
    body: "Dorloter ne référence que des pensions professionnelles · pas de garde entre particuliers. Le SIRET est obligatoire à la création.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Agrément préfecture",
    body: "Selon l'effectif, la pension doit fournir un certificat de capacité animaux domestiques (≤ 9 places) ou une déclaration ICPE (au-delà). On vérifie le numéro auprès de la préfecture concernée.",
  },
  {
    icon: <Phone className="h-5 w-5" />,
    title: "Contact direct",
    body: "On appelle pour confirmer les horaires, les espèces accueillies, les services proposés. La fiche ne devient publique qu'après cet échange.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Badge vert « Agrément vérifié »",
    body: "Affiché en gros sur la fiche publique pour que vous sachiez à qui vous parlez.",
  },
];

const RED_FLAGS = [
  "Demande de paiement intégral avant la rencontre",
  "Refus de visiter les locaux ou de présenter l'animal physiquement",
  "Pas de SIRET ou refus de le communiquer",
  "Annonces qui changent constamment de race / couleur / nom",
  "Pression émotionnelle pour adopter / décider tout de suite",
];

export default function VerificationPage() {
  return (
    <>
      <Navbar />
      <PageContainer className="space-y-12 py-10">
        <header className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-700">
            <ShieldCheck className="h-3 w-3" />
            Confiance
          </p>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Comment Dorloter vérifie ses{" "}
            <span className="bg-linear-to-r from-coral-500 to-coral-400 bg-clip-text text-transparent">
              partenaires
            </span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pas de boîte noire ni d&apos;algorithme magique : chaque refuge et
            chaque pension publiés sur Dorloter est passé entre des mains
            humaines. Voici exactement comment.
          </p>
        </header>

        {/* Refuges */}
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
                Refuges & associations
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                5 étapes avant le badge vert
              </h2>
            </div>
            <Link
              href="/charte-refuges"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-coral-600 hover:underline"
            >
              <Scale className="h-3.5 w-3.5" />
              Charte refuges
            </Link>
          </div>
          <ol className="space-y-3">
            {SHELTER_STEPS.map((step, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-700">
                  {step.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Étape {i + 1}
                  </p>
                  <h3 className="mt-0.5 font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Pensions */}
        <section className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-lavande-600">
              Pensions
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Pros agréés uniquement
            </h2>
          </div>
          <ol className="space-y-3">
            {PENSION_STEPS.map((step, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavande-50 text-lavande-700">
                  {step.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Étape {i + 1}
                  </p>
                  <h3 className="mt-0.5 font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Garde-fous communautaires */}
        <section className="space-y-4 rounded-2xl border border-border bg-muted/30 p-6">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-coral-600" />
            <h2 className="text-xl font-semibold">
              Et après la mise en ligne ?
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Même vérifié, un partenaire peut dériver. C&apos;est pour ça que
            chaque fiche embarque un bouton « Signaler ce contenu » accessible
            à toute personne qui l&apos;ouvre. Un contenu signalé par cinq
            personnes différentes est masqué automatiquement le temps qu&apos;un
            humain réexamine · pas de modération opaque, pas de censure
            instantanée par un seul signalement.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            En cas de plainte sérieuse, le badge peut être retiré, et la fiche
            suspendue. Les détails sont dans la{" "}
            <Link href="/charte-refuges" className="font-medium text-coral-600 hover:underline">
              charte refuges
            </Link>
            .
          </p>
        </section>

        {/* Drapeaux rouges */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-rose-600" />
            <h2 className="text-xl font-semibold">
              Les drapeaux rouges côté adoptant
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Même sur des plateformes vérifiées, restez attentif·ve. Si vous
            croisez l&apos;un de ces signaux, prenez du recul :
          </p>
          <ul className="space-y-2">
            {RED_FLAGS.map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm"
              >
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span className="text-foreground">{flag}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact équipe */}
        <section className="rounded-2xl border border-border bg-linear-to-br from-coral-50 via-card to-lavande-50/40 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-coral-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-foreground">
                Un doute, une remarque ?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                L&apos;équipe Dorloter lit chaque message · n&apos;hésitez pas
                à nous écrire si vous avez repéré un comportement bizarre, ou
                si vous voulez référencer un nouveau partenaire.
              </p>
              <a
                href="mailto:hello@dorloter.fr"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-coral-600"
              >
                <Mail className="h-3.5 w-3.5" />
                hello@dorloter.fr
              </a>
            </div>
          </div>
        </section>

        {/* Liens utiles */}
        <section className="grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
          <Link
            href="/refuges"
            className="rounded-xl border border-border bg-card p-4 text-sm transition hover:bg-muted"
          >
            <p className="font-semibold text-foreground">
              Voir tous les refuges vérifiés
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Annuaire public, filtré par badge.
            </p>
          </Link>
          <Link
            href="/pensions"
            className="rounded-xl border border-border bg-card p-4 text-sm transition hover:bg-muted"
          >
            <p className="font-semibold text-foreground">
              Annuaire des pensions
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              SIRET et agrément vérifiés à l&apos;ouverture.
            </p>
          </Link>
          <Link
            href="/charte-refuges"
            className="rounded-xl border border-border bg-card p-4 text-sm transition hover:bg-muted"
          >
            <p className="font-semibold text-foreground">
              Charte refuges
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Engagements, sanctions, recours.
            </p>
          </Link>
        </section>
      </PageContainer>
      <Footer />
    </>
  );
}
