import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Clock,
  Compass,
  Heart,
  Home as HomeIcon,
  Map,
  PawPrint,
  Radio,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { EasterEgg } from "@/components/easter-egg";
import { placeholderPets } from "@shared/utils/placeholder-images";
import {
  getGlobalAdoptionStats,
  getPets,
  getPrimaryPhotosForPets,
  getRecentTestimonials,
  RecentTestimonialsSection,
} from "@adoption/public";
import {
  getGlobalReportStats,
  getReports,
  ReportMap,
} from "@lost-found/public";
import { getGlobalPensionStats } from "@pensions/public";
import { getGlobalShelterStats } from "@shelters/public";

// La home affiche des compteurs vivants — on rafraîchit toutes les 5 min
// pour ne pas matraquer la DB tout en gardant un sentiment "temps réel".
export const revalidate = 300;

export default async function HomePage() {
  const [
    adoption,
    reportStats,
    pensionStats,
    shelterStats,
    recentReports,
    testimonials,
    showcasePetsRaw,
  ] = await Promise.all([
    getGlobalAdoptionStats(),
    getGlobalReportStats(),
    getGlobalPensionStats(),
    getGlobalShelterStats(),
    getReports({ status: "actif" }, 30),
    getRecentTestimonials(6),
    getPets({}, 12, 0),
  ]);

  // Galerie défilante : les 8 derniers animaux disponibles qui ont au moins
  // une photo principale. Si la DB n'en a pas assez, on retombe sur les
  // placeholders pour ne pas afficher une section vide ou mitigée.
  const photoMap = await getPrimaryPhotosForPets(
    showcasePetsRaw.pets.map((p) => p.id)
  );
  const showcasePets = showcasePetsRaw.pets
    .filter((p) => photoMap.has(p.id))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      name: p.name,
      url: photoMap.get(p.id)!,
    }));
  const hasRealShowcase = showcasePets.length >= 4;

  return (
    <>
      <Navbar />
      <EasterEgg />
      <main id="main" className="flex-1">
        {/* Hero compact */}
        <section className="relative overflow-hidden border-b border-sable-200 px-4 pt-12 pb-10 sm:pt-16">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-coral-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 rounded-full bg-lavande-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-6xl">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-coral-100 px-3 py-1 text-sm font-medium text-coral-700">
              <Sparkles className="h-3.5 w-3.5" />
              Plateforme française pour les animaux
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
              Adopter, retrouver,{" "}
              <span className="bg-linear-to-r from-coral-500 to-coral-400 bg-clip-text text-transparent">
                prendre soin.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Tout commence par une intention. Choisissez la vôtre · vous
              n&apos;avez pas besoin de compte pour explorer.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-coral-500" />
                Gratuit, sans pub
              </span>
              <span className="h-4 w-px bg-sable-300" />
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                SIRET vérifiés
              </span>
              <span className="h-4 w-px bg-sable-300" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Alertes de proximité
              </span>
            </div>
          </div>
        </section>

        {/* Bandeau de stats vivantes */}
        <StatsStrip
          available={adoption.available}
          adoptedThisMonth={adoption.adoptedThisMonth}
          activeReports={reportStats.active}
          resolvedThisMonth={reportStats.resolvedThisMonth}
          shelters={shelterStats.verified}
          pensions={pensionStats.verified}
        />

        {/* 3 cartes d'intention — cœur de la home */}
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
                  Par où commencer
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Que cherchez-vous aujourd&apos;hui ?
                </h2>
              </div>
              <Link
                href="/adopter/quiz"
                className="hidden items-center gap-1.5 rounded-full border border-coral-300 bg-coral-50 px-4 py-2 text-sm font-medium text-coral-700 transition hover:bg-coral-100 sm:inline-flex"
              >
                <Compass className="h-3.5 w-3.5" />
                Faire le quiz « Quel animal pour vous ? »
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <IntentionCard
                href="/adopter/liste"
                accent="coral"
                eyebrow="Adopter"
                title="Trouver un compagnon"
                description="Chats et chiens en refuge, fiches détaillées, filtres par compatibilité · ou en mode swipe pour la sérendipité."
                stat={`${adoption.available} animaux à adopter`}
                icon={<Heart className="h-6 w-6" fill="currentColor" />}
              />
              <IntentionCard
                href="/perdus-trouves"
                accent="lavande"
                eyebrow="Perdus & trouvés"
                title="Signaler ou retrouver"
                description="Réseau géolocalisé. Le système rapproche automatiquement les annonces compatibles."
                stat={`${reportStats.active} signalement${reportStats.active > 1 ? "s" : ""} actif${reportStats.active > 1 ? "s" : ""}`}
                icon={<Radio className="h-6 w-6" />}
              />
              <IntentionCard
                href="/pensions"
                accent="prune"
                eyebrow="Pensions agréées"
                title="Faire garder votre animal"
                description="Pensions professionnelles avec SIRET et agrément préfecture vérifiés. Contact direct."
                stat={`${pensionStats.verified} pension${pensionStats.verified > 1 ? "s" : ""} référencée${pensionStats.verified > 1 ? "s" : ""}`}
                icon={<HomeIcon className="h-6 w-6" />}
              />
            </div>

            {/* Mobile : quiz en bas pour rester accessible */}
            <Link
              href="/adopter/quiz"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-coral-300 bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700 sm:hidden"
            >
              <Compass className="h-3.5 w-3.5" />
              Faire le quiz « Quel animal pour vous ? »
            </Link>
          </div>
        </section>

        {/* Mini-carte des derniers signalements */}
        {recentReports.length > 0 && (
          <section className="border-y border-sable-200 bg-sable-50/60 px-4 py-12">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-prune-700">
                    <Radio className="h-3 w-3 animate-pulse" />
                    En direct
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Animaux signalés près de chez vous
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {reportStats.perdus} perdu{reportStats.perdus > 1 ? "s" : ""}
                    , {reportStats.trouves} trouvé
                    {reportStats.trouves > 1 ? "s" : ""}. Cliquez sur un point
                    pour voir la fiche.
                  </p>
                </div>
                <Link
                  href="/perdus-trouves"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Map className="h-4 w-4" />
                  Voir la carte complète
                </Link>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <ReportMap reports={recentReports} height={360} />
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-prune-600 ring-2 ring-white" />
                  Animal perdu
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-lavande-600 ring-2 ring-white" />
                  Animal trouvé
                </span>
                {reportStats.resolvedTotal > 0 && (
                  <span className="ml-auto text-foreground/80">
                    💛{" "}
                    <strong>{reportStats.resolvedTotal}</strong> retrouvaille
                    {reportStats.resolvedTotal > 1 ? "s" : ""} confirmée
                    {reportStats.resolvedTotal > 1 ? "s" : ""} depuis le
                    lancement
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Témoignages d'adoption */}
        <RecentTestimonialsSection testimonials={testimonials} />

        {/* Galerie défilante */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
              {hasRealShowcase
                ? "Quelques-uns, parmi ceux qui attendent"
                : "Bientôt, les premiers profils des refuges partenaires"}
            </p>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {hasRealShowcase
                ? showcasePets.map((pet) => (
                    <Link
                      key={pet.id}
                      href={`/adopter/${pet.id}`}
                      className="group relative h-48 w-36 shrink-0 overflow-hidden rounded-2xl sm:h-56 sm:w-44"
                      aria-label={`Voir la fiche de ${pet.name}`}
                    >
                      <Image
                        src={pet.url}
                        alt={`${pet.name}, à adopter`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="176px"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3">
                        <p className="text-sm font-semibold text-white">
                          {pet.name}
                        </p>
                      </div>
                    </Link>
                  ))
                : Object.entries(placeholderPets).map(([name, src]) => (
                    <div
                      key={name}
                      aria-hidden
                      className="relative h-48 w-36 shrink-0 overflow-hidden rounded-2xl sm:h-56 sm:w-44"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="176px"
                      />
                      <div className="absolute inset-0 bg-sable-50/30" />
                    </div>
                  ))}
            </div>
          </div>
        </section>

        {/* Quiz teaser */}
        <section className="border-t border-sable-200 bg-linear-to-br from-coral-50/40 via-white to-lavande-50/40 px-4 py-16">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-coral-600">
                Pas sûr·e de vous ?
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Quel animal pour votre vie ?
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                7 questions rapides · type de logement, présence d&apos;enfants,
                temps disponible · et on vous propose les profils
                d&apos;animaux qui colleront le mieux. Sans inscription.
              </p>
              <Link
                href="/adopter/quiz"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-coral-500 px-6 py-3 font-semibold text-white shadow-md shadow-coral-500/25 transition hover:bg-coral-600 hover:shadow-lg"
              >
                <Compass className="h-4 w-4" />
                Démarrer le quiz
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:max-w-md md:justify-self-end">
              <QuizTeaserCard
                question="Maison ou appartement ?"
                hint="On adapte la suggestion à votre espace."
              />
              <QuizTeaserCard
                question="Des enfants à la maison ?"
                hint="Compatibilité avec les petits."
              />
              <QuizTeaserCard
                question="Premier animal ?"
                hint="On évite les profils exigeants."
              />
              <QuizTeaserCard
                question="Combien de temps par jour ?"
                hint="Chat tranquille ou chien sportif."
              />
            </div>
          </div>
        </section>

        {/* Refuges teaser */}
        <section className="border-t border-sable-200 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 md:grid-cols-3">
              <div className="md:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
                  Derrière chaque profil
                </p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  Des refuges qui ouvrent leurs portes.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  {shelterStats.verified} refuge
                  {shelterStats.verified > 1 ? "s" : ""} vérifié
                  {shelterStats.verified > 1 ? "s" : ""} sur Dorloter · page
                  publique gratuite, contact direct, zéro commission sur les
                  adoptions.
                </p>
                <Link
                  href="/refuges"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-coral-600 hover:text-coral-700"
                >
                  Voir l&apos;annuaire
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
                <FeatureCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="SIRET vérifiés"
                  body="Chaque refuge est contrôlé manuellement avant publication."
                />
                <FeatureCard
                  icon={<PawPrint className="h-5 w-5" />}
                  title="Fiches riches"
                  body="Caractère, santé, compatibilités · pour décider en connaissance de cause."
                />
                <FeatureCard
                  icon={<Heart className="h-5 w-5" fill="currentColor" />}
                  title="Suivi candidatures"
                  body="Du dépôt à la rencontre, vous savez où en est votre dossier."
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden px-4 py-20">
          <div className="absolute inset-0">
            <Image
              src={placeholderPets.chaton}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-coral-600/85" />
          </div>
          <div className="relative mx-auto max-w-3xl text-center text-white">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Quelque part, un compagnon vous attend.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-coral-100">
              Le compte est gratuit. Il sert à garder vos coups de cœur, à
              candidater et à recevoir les alertes si votre animal est signalé
              quelque part.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-full bg-white px-6 py-3 font-semibold text-coral-600 shadow-lg transition-all hover:bg-coral-50 hover:shadow-xl"
              >
                Créer un compte
              </Link>
              <Link
                href="/adopter"
                className="rounded-full border-2 border-white/40 px-6 py-3 font-semibold text-white transition-all hover:border-white/70 hover:bg-white/10"
              >
                Continuer sans compte
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function StatsStrip({
  available,
  adoptedThisMonth,
  activeReports,
  resolvedThisMonth,
  shelters,
  pensions,
}: {
  available: number;
  adoptedThisMonth: number;
  activeReports: number;
  resolvedThisMonth: number;
  shelters: number;
  pensions: number;
}) {
  const items: { value: number; label: string; tone: string }[] = [
    { value: available, label: "à adopter", tone: "text-coral-700" },
    {
      value: adoptedThisMonth,
      label: "adoptés ce mois",
      tone: "text-green-700",
    },
    { value: activeReports, label: "signalements actifs", tone: "text-prune-700" },
    {
      value: resolvedThisMonth,
      label: "retrouvailles ce mois",
      tone: "text-lavande-700",
    },
    { value: shelters, label: "refuges vérifiés", tone: "text-foreground" },
    { value: pensions, label: "pensions agréées", tone: "text-foreground" },
  ];

  return (
    <section className="border-y border-sable-200 bg-white px-4 py-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 text-center">
        {items.map((it, i) => (
          <div key={i} className="flex-1 min-w-[10rem]">
            <div className={`text-2xl font-bold tabular-nums ${it.tone}`}>
              {it.value}
            </div>
            <div className="text-xs text-muted-foreground">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntentionCard({
  href,
  accent,
  eyebrow,
  title,
  description,
  stat,
  icon,
}: {
  href: string;
  accent: "coral" | "lavande" | "prune";
  eyebrow: string;
  title: string;
  description: string;
  stat: string;
  icon: React.ReactNode;
}) {
  const tones: Record<typeof accent, { ring: string; bg: string; text: string; gradient: string }> = {
    coral: {
      ring: "hover:ring-coral-300",
      bg: "bg-coral-100",
      text: "text-coral-700",
      gradient: "from-coral-50 to-white",
    },
    lavande: {
      ring: "hover:ring-lavande-300",
      bg: "bg-lavande-100",
      text: "text-lavande-700",
      gradient: "from-lavande-50 to-white",
    },
    prune: {
      ring: "hover:ring-prune-300",
      bg: "bg-prune-100",
      text: "text-prune-700",
      gradient: "from-prune-50 to-white",
    },
  };
  const t = tones[accent];

  return (
    <Link
      href={href}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-linear-to-br ${t.gradient} p-6 ring-2 ring-transparent transition hover:-translate-y-0.5 hover:shadow-lg ${t.ring}`}
    >
      <div
        className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${t.bg} ${t.text}`}
        aria-hidden
      >
        {icon}
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${t.text}`}>
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-sm font-medium tabular-nums text-foreground">
          {stat}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold ${t.text} transition-transform group-hover:translate-x-0.5`}
        >
          Y aller
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function QuizTeaserCard({
  question,
  hint,
}: {
  question: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">{question}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-coral-50 text-coral-600">
        {icon}
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
