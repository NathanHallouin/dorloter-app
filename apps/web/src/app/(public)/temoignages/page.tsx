import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Cat,
  ChevronLeft,
  ChevronRight,
  Dog,
  Heart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  listTestimonials,
  getSheltersWithTestimonials,
  type PublicTestimonial,
} from "@adoption/public";
import { EmptyState } from "@shared/ui/empty-state";

export const revalidate = 600;

interface PageProps {
  searchParams: Promise<{
    species?: string;
    shelter?: string;
    since?: string;
    verified?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 18;

export const metadata: Metadata = {
  title: "Témoignages d'adoption",
  description:
    "Retours d'adoptants Dorloter : les histoires des chats et chiens qui ont trouvé leur famille via la plateforme. Témoignages vérifiés après 3 mois d'adaptation.",
  alternates: { canonical: "/temoignages" },
  openGraph: {
    title: "Témoignages d'adoption · Dorloter",
    description:
      "Les retours des familles qui ont adopté via Dorloter. Histoires vraies, photos, suivi long-terme.",
    type: "website",
  },
};

const SINCE_OPTIONS: Record<string, { days: number; label: string }> = {
  "30d": { days: 30, label: "30 derniers jours" },
  "365d": { days: 365, label: "12 derniers mois" },
};

export default async function TestimonialsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const species =
    params.species === "chat" || params.species === "chien"
      ? params.species
      : undefined;
  const shelterId = params.shelter || undefined;
  const sinceKey =
    params.since && params.since in SINCE_OPTIONS ? params.since : undefined;
  const sinceDays = sinceKey ? SINCE_OPTIONS[sinceKey]!.days : undefined;
  const verifiedOnly = params.verified === "1";
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [result, sheltersWithT] = await Promise.all([
    listTestimonials(
      { species, shelterId, sinceDays, verifiedOnly },
      PAGE_SIZE,
      offset
    ),
    getSheltersWithTestimonials(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeShelter = sheltersWithT.find((s) => s.id === shelterId);

  // Construction de l'URL des filtres
  function chipHref(updates: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    const merge = {
      species,
      shelter: shelterId,
      since: sinceKey,
      verified: verifiedOnly ? "1" : undefined,
      ...updates,
    };
    for (const [k, v] of Object.entries(merge)) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/temoignages?${qs}` : "/temoignages";
  }

  const verifiedCount = result.testimonials.filter((t) => t.isVerified).length;

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="border-b border-sable-200 bg-gradient-to-br from-coral-50/50 via-white to-lavande-50/40 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-coral-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral-700">
              <Sparkles className="h-3 w-3" />
              Témoignages d&apos;adoption
            </p>
            <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Les histoires qui font Dorloter
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {result.total} témoignage{result.total > 1 ? "s" : ""} publié
              {result.total > 1 ? "s" : ""} par des adoptants. Ceux marqués{" "}
              <ShieldCheck className="inline h-3.5 w-3.5 text-coral-600" /> ont
              été rédigés au moins 90 jours après l&apos;adoption, signe que
              l&apos;adaptation a eu le temps de se faire.
            </p>
          </div>
        </section>

        {/* Filtres */}
        <section className="border-b border-sable-200 bg-card/60 px-4 py-4">
          <div className="mx-auto max-w-5xl space-y-3">
            <FilterRow label="Espèce">
              <FilterChip
                href={chipHref({ species: undefined })}
                active={!species}
                label="Tous"
              />
              <FilterChip
                href={chipHref({ species: "chat" })}
                active={species === "chat"}
                icon={<Cat className="h-3 w-3" />}
                label="Chats"
              />
              <FilterChip
                href={chipHref({ species: "chien" })}
                active={species === "chien"}
                icon={<Dog className="h-3 w-3" />}
                label="Chiens"
              />
            </FilterRow>

            <FilterRow label="Période">
              <FilterChip
                href={chipHref({ since: undefined })}
                active={!sinceKey}
                label="Tout temps"
              />
              {Object.entries(SINCE_OPTIONS).map(([key, opt]) => (
                <FilterChip
                  key={key}
                  href={chipHref({ since: key })}
                  active={sinceKey === key}
                  label={opt.label}
                />
              ))}
            </FilterRow>

            <FilterRow label="Type">
              <FilterChip
                href={chipHref({ verified: undefined })}
                active={!verifiedOnly}
                label="Tous"
              />
              <FilterChip
                href={chipHref({ verified: "1" })}
                active={verifiedOnly}
                icon={<ShieldCheck className="h-3 w-3" />}
                label="Vérifiés uniquement"
              />
            </FilterRow>

            {sheltersWithT.length > 0 && (
              <FilterRow label="Refuge">
                <FilterChip
                  href={chipHref({ shelter: undefined })}
                  active={!shelterId}
                  label="Tous les refuges"
                />
                {sheltersWithT.slice(0, 12).map((s) => (
                  <FilterChip
                    key={s.id}
                    href={chipHref({ shelter: s.id })}
                    active={shelterId === s.id}
                    label={`${s.name} (${s.count})`}
                  />
                ))}
              </FilterRow>
            )}

            {(species || shelterId || sinceKey || verifiedOnly) && (
              <div className="pt-1">
                <Link
                  href="/temoignages"
                  className="text-xs text-coral-600 hover:underline"
                >
                  Réinitialiser les filtres
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Liste */}
        <section className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            {result.testimonials.length === 0 ? (
              <EmptyState
                variant="illustrated"
                icon={<Heart className="h-9 w-9" />}
                title="Aucun témoignage avec ces filtres"
                hint={
                  activeShelter
                    ? `${activeShelter.name} n'a pas encore reçu de témoignage publié avec ces critères.`
                    : "Essayez d'élargir la sélection."
                }
              />
            ) : (
              <>
                <p className="mb-5 text-xs text-muted-foreground">
                  Page {page} / {totalPages} ·{" "}
                  {verifiedCount > 0 && (
                    <>
                      <strong className="text-coral-700">
                        {verifiedCount}
                      </strong>{" "}
                      vérifié{verifiedCount > 1 ? "s" : ""} sur la page ·{" "}
                    </>
                  )}
                  {result.total} au total
                </p>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {result.testimonials.map((t) => (
                    <TestimonialCard key={t.id} testimonial={t} />
                  ))}
                </ul>

                {totalPages > 1 && (
                  <nav
                    aria-label="Pagination"
                    className="mt-8 flex items-center justify-center gap-2 text-sm"
                  >
                    {page > 1 && (
                      <Link
                        href={chipHref({
                          page: page > 2 ? String(page - 1) : undefined,
                        })}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 font-medium hover:border-coral-300"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Précédent
                      </Link>
                    )}
                    <span className="px-3 text-xs text-muted-foreground">
                      Page {page} / {totalPages}
                    </span>
                    {page < totalPages && (
                      <Link
                        href={chipHref({ page: String(page + 1) })}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 font-medium hover:border-coral-300"
                      >
                        Suivant
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
        active
          ? "bg-coral-500 text-white"
          : "border border-border bg-card text-foreground hover:border-coral-300"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function TestimonialCard({ testimonial: t }: { testimonial: PublicTestimonial }) {
  const datelabel = new Date(t.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-coral-300/70 hover:shadow-md">
      <Link href={`/adopter/${t.pet.id}`} className="block">
        <div className="relative h-44 bg-sable-100">
          {t.photoUrl ? (
            <Image
              src={t.photoUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover"
            />
          ) : t.pet.photoUrl ? (
            <Image
              src={t.pet.photoUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">
              {t.pet.species === "chat" ? "🐈" : "🐕"}
            </div>
          )}
          {t.isVerified && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral-700 backdrop-blur">
              <ShieldCheck className="h-3 w-3" />
              Vérifié
            </span>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-coral-600">
            {t.authorFirstName} & {t.pet.name}
          </p>
          <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-foreground">
            « {t.content} »
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {datelabel}
            {t.daysSinceAdoption !== null && (
              <>
                {" · "}
                {formatDaysSinceAdoption(t.daysSinceAdoption)}
              </>
            )}
            {t.shelter && (
              <>
                {" · "}
                <span className="font-medium text-foreground">
                  {t.shelter.name}
                </span>
              </>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}

function formatDaysSinceAdoption(days: number): string {
  if (days < 30) return `${days} jour${days > 1 ? "s" : ""} après l'adoption`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mois après l'adoption`;
  const years = Math.floor(days / 365);
  return `${years} an${years > 1 ? "s" : ""} après l'adoption`;
}
