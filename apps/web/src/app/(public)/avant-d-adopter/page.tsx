import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Heart,
  HelpCircle,
  PawPrint,
  ShoppingBasket,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getRecentTestimonials,
  RecentTestimonialsSection,
} from "@adoption/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Avant d'adopter",
  description:
    "Guide complet pour adopter un chat ou un chien en refuge : budget, matériel, idées reçues, témoignages. Tout ce qu'il faut savoir avant de franchir le pas.",
  alternates: { canonical: "/avant-d-adopter" },
  openGraph: {
    title: "Avant d'adopter · Dorloter",
    description:
      "Coûts, équipement, idées reçues : prenez le temps de bien préparer l'arrivée de votre futur compagnon.",
    type: "article",
  },
};

const SECTIONS = [
  { id: "pret", label: "Suis-je prêt·e ?", icon: HelpCircle },
  { id: "couts", label: "Combien ça coûte", icon: Wallet },
  { id: "materiel", label: "Préparer l'arrivée", icon: ShoppingBasket },
  { id: "idees-recues", label: "Idées reçues", icon: Sparkles },
  { id: "temoignages", label: "Ils l'ont fait", icon: Heart },
] as const;

const READINESS_CHECKLIST: Array<{ q: string; hint: string }> = [
  {
    q: "Mon logement convient-il à l'animal envisagé ?",
    hint: "Un chat indoor ne demande pas d'espace extérieur, mais un chien actif aura besoin de sorties quotidiennes. Vérifier le bail si vous êtes locataire.",
  },
  {
    q: "Combien de temps puis-je consacrer chaque jour ?",
    hint: "Compter minimum 2h pour un chien (sorties, jeu, présence). Un chat demande moins, mais reste un être social, pas un objet déco.",
  },
  {
    q: "Mon budget couvre-t-il les frais réguliers et imprévus ?",
    hint: "Au-delà du quotidien (croquettes, litière), un vétérinaire d'urgence peut coûter 500-2000€. Une mutuelle animale est à envisager.",
  },
  {
    q: "Suis-je engagé·e sur la durée du compagnonnage ?",
    hint: "Un chat vit 12-18 ans, un chien 10-15 ans. C'est une responsabilité jusqu'au bout, déménagement et changement de vie compris.",
  },
  {
    q: "Le reste du foyer est-il aligné ?",
    hint: "Conjoint·e, enfants, autres animaux : la décision se prend ensemble, et la cohabitation se prépare aussi.",
  },
];

const COSTS: Array<{
  category: string;
  cat: string;
  dog: string;
  note?: string;
}> = [
  {
    category: "Adoption en refuge",
    cat: "150 à 250 €",
    dog: "200 à 400 €",
    note: "Identification, vaccins, stérilisation inclus dans le tarif",
  },
  {
    category: "Alimentation mensuelle",
    cat: "20 à 50 €",
    dog: "40 à 120 €",
    note: "Selon gamme et taille de l'animal",
  },
  {
    category: "Litière (mensuel, chat)",
    cat: "10 à 25 €",
    dog: "",
  },
  {
    category: "Vétérinaire de routine (annuel)",
    cat: "80 à 150 €",
    dog: "150 à 250 €",
    note: "Vaccins, vermifuges, anti-puces",
  },
  {
    category: "Vétérinaire imprévu (estimation)",
    cat: "300 à 1 500 €",
    dog: "500 à 2 500 €",
    note: "Une mutuelle animale couvre 50 à 90 % à partir de ~10-30 €/mois",
  },
  {
    category: "Équipement initial",
    cat: "100 à 200 €",
    dog: "200 à 400 €",
    note: "Voir checklist ci-dessous",
  },
  {
    category: "Pension pendant vacances",
    cat: "12 à 22 € /jour",
    dog: "20 à 40 € /jour",
    note: "Annuaire des pensions agréées disponible",
  },
];

const SUPPLIES: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: "Pour un chat",
    items: [
      "Bac à litière + litière (privilégier l'agglomérante végétale)",
      "Gamelles (eau, croquettes) en céramique ou inox",
      "Arbre à chat ou perchoir (les chats vivent en 3D)",
      "Jouets variés (canne à pêche, balles, kicker)",
      "Caisse de transport rigide (obligatoire véto)",
      "Brosse adaptée au pelage",
      "Coupe-griffes",
      "Couchage en hauteur",
    ],
  },
  {
    title: "Pour un chien",
    items: [
      "Collier + médaille (avec votre numéro)",
      "Laisse robuste + harnais éventuel",
      "Gamelles antidérapantes",
      "Couchage adapté à la taille adulte",
      "Caisse ou parc selon l'âge",
      "Brosse adaptée + kit de soin (oreilles, dents)",
      "Sac de transport ou ceinture de sécurité voiture",
      "Jouets indestructibles + à mâcher",
      "Sacs ramassage déjections (obligatoire en ville)",
    ],
  },
  {
    title: "Pour les deux",
    items: [
      "Trousse de premier secours (compresses, désinfectant véto)",
      "Coordonnées du vétérinaire de garde affichées",
      "Identification (puce ICAD à jour, obligatoire)",
      "Garde de secours identifiée (voisin, famille)",
    ],
  },
];

const MYTHS: Array<{ myth: string; reality: string }> = [
  {
    myth: "« Les animaux en refuge sont là parce qu'ils ont un problème. »",
    reality:
      "La majorité arrive suite à un déménagement, séparation, décès, allergie tardive ou portée non désirée. Le caractère est connu de l'équipe, qui vous oriente vers un profil adapté.",
  },
  {
    myth: "« Adopter un chiot/chaton, c'est mieux pour bien l'éduquer. »",
    reality:
      "Un adulte calme est souvent plus simple : socialisation faite, propreté acquise, énergie modérée. Idéal pour une première adoption ou un foyer occupé.",
  },
  {
    myth: "« Les races de refuge sont moins en bonne santé. »",
    reality:
      "Tous les animaux confiés à un refuge partenaire sont identifiés, vaccinés, vermifugés et stérilisés. Un dossier vétérinaire complet est remis à l'adoption.",
  },
  {
    myth: "« Un chien adulte ne s'attache pas à une nouvelle famille. »",
    reality:
      "Les chiens forment des liens forts à tout âge. Compter 3 semaines pour la décompression, 3 mois pour s'installer, 3 ans pour partager une routine totalement intégrée.",
  },
  {
    myth: "« Mieux vaut acheter en animalerie : c'est plus simple. »",
    reality:
      "Beaucoup d'animaux vendus en animalerie viennent d'élevages intensifs européens (Hongrie, Slovaquie). Ils sont souvent fragiles et coupés trop tôt de leur mère. Un refuge offre transparence et accompagnement.",
  },
];

export default async function AvantDAdopterPage() {
  const testimonials = await getRecentTestimonials(4).catch(() => []);

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-sable-200 bg-gradient-to-br from-coral-50/60 via-white to-lavande-50/40 px-4 py-16 sm:py-20">
          <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-coral-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-lavande-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-coral-100 px-3 py-1 text-sm font-medium text-coral-700">
              <PawPrint className="h-3.5 w-3.5" />
              Guide pré-adoption
            </p>
            <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Avant d&apos;adopter, prenez quelques minutes.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Adopter, c&apos;est un engagement de 10 à 18 ans. Ce guide
              rassemble ce que les refuges et vétérinaires partagent à chaque
              nouveau foyer. Lisez, prenez des notes, puis revenez quand
              vous serez prêt·e.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/adopter/quiz"
                className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-6 py-3 font-semibold text-white shadow-md shadow-coral-500/25 transition hover:bg-coral-600"
              >
                <Compass className="h-4 w-4" />
                Faire le quiz « Quel animal pour vous ? »
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* TOC sticky desktop / horizontal mobile */}
        <nav
          aria-label="Plan du guide"
          className="sticky top-14 z-30 border-b border-sable-200 bg-white/95 backdrop-blur"
        >
          <div className="mx-auto max-w-4xl px-4">
            <ul className="flex gap-1 overflow-x-auto py-3 text-sm">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id} className="shrink-0">
                    <a
                      href={`#${s.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-muted-foreground transition hover:bg-sable-100 hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {s.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="mx-auto max-w-4xl space-y-16 px-4 py-12">
          {/* Suis-je prêt·e */}
          <Section
            id="pret"
            icon={HelpCircle}
            eyebrow="Étape 1"
            title="Suis-je prêt·e ?"
            intro="5 questions à se poser honnêtement. Si vous hésitez sur plus de deux, attendez un peu : ce n'est pas le moment qui manque, c'est la préparation."
          >
            <ol className="space-y-3">
              {READINESS_CHECKLIST.map((c, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-100 text-sm font-bold text-coral-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{c.q}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {c.hint}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* Combien ça coûte */}
          <Section
            id="couts"
            icon={Wallet}
            eyebrow="Étape 2"
            title="Combien ça coûte vraiment"
            intro="Le tarif d'adoption en refuge ne couvre que les soins de base. Voici une vue réaliste des coûts mensuels et annuels, à partir des fourchettes constatées par les associations partenaires."
          >
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-sable-50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Poste</th>
                    <th className="px-4 py-3 text-left">Chat</th>
                    <th className="px-4 py-3 text-left">Chien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sable-100">
                  {COSTS.map((row, i) => (
                    <tr key={i} className="align-top hover:bg-sable-50/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {row.category}
                        </p>
                        {row.note && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                        {row.cat}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                        {row.dog}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Estimations indicatives basées sur les retours des refuges
              partenaires et des cabinets vétérinaires (France métropolitaine,
              2025-2026). Vérifiez avec votre véto local et votre refuge.
            </p>
            <div className="mt-4">
              <Link
                href="/adopter/coute-combien"
                className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
              >
                Calculer une estimation personnalisée
              </Link>
            </div>
          </Section>

          {/* Matériel */}
          <Section
            id="materiel"
            icon={ShoppingBasket}
            eyebrow="Étape 3"
            title="Préparer l'arrivée"
            intro="L'idéal : avoir tout en place quelques jours avant le retour de l'animal. Les premiers jours sont une période sensible : moins on improvise, mieux ça se passe."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {SUPPLIES.map((group) => (
                <div
                  key={group.title}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-coral-600">
                    {group.title}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* Idées reçues */}
          <Section
            id="idees-recues"
            icon={Sparkles}
            eyebrow="Étape 4"
            title="Les idées reçues"
            intro="Les croyances qui freinent l'adoption, et ce qu'en disent vraiment les professionnels du secteur."
          >
            <div className="space-y-3">
              {MYTHS.map((m, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-border bg-card p-4 transition open:bg-coral-50/40"
                >
                  <summary className="flex cursor-pointer items-start gap-3 list-none">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-100 text-xs font-bold text-coral-700 group-open:bg-coral-200">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-semibold leading-snug text-foreground">
                      {m.myth}
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 pl-10 text-sm leading-relaxed text-muted-foreground">
                    {m.reality}
                  </p>
                </details>
              ))}
            </div>
          </Section>

          {/* CTA mid-page */}
          <section className="rounded-2xl border border-coral-200 bg-gradient-to-br from-coral-50 to-white p-6 text-center sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
              Prêt·e à passer à l&apos;étape suivante ?
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
              Découvrez les animaux qui vous attendent
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Filtres par espèce, compatibilité enfants, autres animaux, mode
              de vie. Sans inscription requise pour explorer.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/adopter/liste"
                className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-coral-500/25 transition hover:bg-coral-600"
              >
                Voir les profils
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/refuges"
                className="inline-flex items-center gap-2 rounded-full border border-coral-300 bg-white px-5 py-2.5 text-sm font-semibold text-coral-700 hover:bg-coral-50"
              >
                Explorer les refuges
              </Link>
            </div>
          </section>
        </div>

        {/* Témoignages */}
        <section id="temoignages">
          <RecentTestimonialsSection testimonials={testimonials} />
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({
  id,
  icon: Icon,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  icon: typeof HelpCircle;
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-coral-600">
          <Icon className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {intro}
        </p>
      </header>
      {children}
    </section>
  );
}
