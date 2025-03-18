import { EmptyState } from "@shared/ui/empty-state";
import { VerifiedBadge } from "@shared/ui/verified-badge";
import { DemoBadge } from "@shared/ui/demo-badge";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  Clock,
  ExternalLink,
  FileText,
  HeartHandshake,
  PawPrint as PawIcon,
  Calendar,
  Share2,
  ChevronLeft,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ReportContentDialog } from "@moderation/public";
import { TrackVisit } from "@/components/pwa/track-visit";
import { FollowButton } from "@shelters/public";
import { ShareLinkButton } from "@/components/shared/share-link-button";
import { ContactShelterButton } from "@messaging/public";
import { LocationView } from "@/components/map/location-view";
import { TripEstimateWidget } from "@/components/shared/trip-estimate-widget";
import { PetCard } from "@adoption/public";
import {
  getShelterById,
  getShelterPublicStats,
  getPublicDocumentsForShelter,
  formatBytes,
  DOCUMENT_KIND_LABELS,
} from "@shelters/public";
import { getPets } from "@adoption/public";
import { db } from "@infra/db";
import { petPhotos, shelters } from "@/server/db/schema";

export const revalidate = 3600;

export async function generateStaticParams() {
  const rows = await db.select({ id: shelters.id }).from(shelters);
  return rows.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const shelter = await getShelterById(id);
  if (!shelter) return { title: "Refuge introuvable" };

  const title = shelter.name;
  const description =
    shelter.description?.slice(0, 160) ??
    `${shelter.name}, refuge et association partenaire de Dorloter.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: shelter.coverUrl ? [{ url: shelter.coverUrl }] : undefined,
    },
  };
}

export default async function ShelterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shelter = await getShelterById(id);
  if (!shelter) notFound();

  const [{ pets: shelterCats }, publicStats, publicDocs] = await Promise.all([
    getPets({ shelterId: shelter.id }, 50, 0),
    getShelterPublicStats(shelter.id),
    getPublicDocumentsForShelter(shelter.id),
  ]);

  const photos = await db
    .select()
    .from(petPhotos)
    .where(eq(petPhotos.isPrimary, true));
  const photoMap = new Map(photos.map((p) => [p.petId, p]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AnimalShelter",
    name: shelter.name,
    description: shelter.description ?? undefined,
    telephone: shelter.phone ?? undefined,
    email: shelter.email ?? undefined,
    url: shelter.website ?? undefined,
    address: shelter.address ?? undefined,
    image: shelter.coverUrl ?? shelter.logoUrl ?? undefined,
    foundingDate: shelter.foundedYear
      ? String(shelter.foundedYear)
      : undefined,
  };

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <TrackVisit url={`/refuges/${shelter.id}`} title={shelter.name} />

        {/* Hero : cover + overlay + logo flottant */}
        <section className="relative">
          <div className="relative h-56 overflow-hidden bg-linear-to-br from-lavande-100 via-sable-100 to-coral-100 sm:h-72">
            {shelter.coverUrl && (
              <Image
                src={shelter.coverUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
          </div>

          <div className="mx-auto w-full max-w-6xl px-4">
            <Link
              href="/refuges"
              className="absolute left-4 top-20 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Tous les refuges
            </Link>

            {/* Logo flottant au bord du cover */}
            <div className="relative -mt-16 flex flex-wrap items-end gap-4 sm:-mt-20">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-28 sm:w-28">
                {shelter.logoUrl ? (
                  <Image
                    src={shelter.logoUrl}
                    alt={shelter.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-coral-50 text-3xl font-bold text-coral-600">
                    {shelter.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {shelter.name}
                  </h1>
                  {shelter.isVerified && <VerifiedBadge variant="shelter" />}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {shelter.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {shelter.address}
                    </span>
                  )}
                  {shelter.foundedYear && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Depuis {shelter.foundedYear}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pb-2">
                <FollowButton
                  shelterId={shelter.id}
                  initialFollowers={publicStats.followers}
                />
                <ContactShelterButton
                  shelterId={shelter.id}
                  shelterName={shelter.name}
                  variant="outline"
                  label="Contacter"
                />
                <ShareLinkButton
                  label={shelter.name}
                  url={`/refuges/${shelter.id}`}
                />
              </div>
            </div>

            {shelter.description && (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {shelter.description}
              </p>
            )}

            {/* Strip de stats */}
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              <StatTile
                label="À adopter"
                value={publicStats.available}
                accent="coral"
                icon={<PawIcon className="h-4 w-4" />}
              />
              <StatTile
                label="En cours d'adoption"
                value={publicStats.reserved}
                accent="lavande"
              />
              <StatTile
                label="Déjà adoptés"
                value={publicStats.adopted}
                accent="green"
              />
              <StatTile
                label="Nous suivent"
                value={publicStats.followers}
                accent="prune"
                icon={<HeartHandshake className="h-4 w-4" />}
              />
            </div>
          </div>
        </section>

        <div className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16">
          {shelter.isDemo && <DemoBadge variant="banner" className="mb-6" />}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Colonne principale */}
            <div className="lg:col-span-2">
              {/* Mission longue */}
              {shelter.missionLong && (
                <section className="mb-10">
                  <h2 className="mb-3 text-xl font-semibold">Notre mission</h2>
                  <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                    {shelter.missionLong}
                  </div>
                </section>
              )}

              {/* Chats */}
              <section>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">
                    Animaux à adopter ({shelterCats.length})
                  </h2>
                  {shelterCats.length > 0 && (
                    <Link
                      href={`/adopter/liste?shelter=${shelter.id}`}
                      className="text-sm font-medium text-coral-600 hover:underline"
                    >
                      Voir tous →
                    </Link>
                  )}
                </div>

                {shelterCats.length === 0 ? (
                  <EmptyState
                    icon={<PawIcon className="h-8 w-8" />}
                    title="Pas d'animal à l'adoption pour le moment."
                    hint="Suivez le refuge pour être alerté·e dès qu'un nouveau profil apparaît."
                  />
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {shelterCats.map((pet) => (
                      <PetCard
                        key={pet.id}
                        pet={pet}
                        photo={photoMap.get(pet.id)}
                        showFavorite
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Soutenir */}
              {shelter.donationUrl && (
                <section className="rounded-xl border border-coral-200 bg-coral-50/60 p-5">
                  <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-coral-700">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    Soutenir le refuge
                  </div>
                  <p className="mb-4 whitespace-pre-wrap text-sm text-foreground">
                    {shelter.donationDescription?.trim() ||
                      "Un don permet aux bénévoles de soigner, nourrir et abriter les animaux recueillis."}
                  </p>
                  <a
                    href={shelter.donationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {shelter.donationLabel?.trim() || "Faire un don"}
                  </a>
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    Vous serez redirigé·e vers la plateforme du refuge.
                    Dorloter ne collecte aucun paiement.
                  </p>
                </section>
              )}

              {/* Documents publics */}
              {publicDocs.length > 0 && (
                <section className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Documents publics
                  </h3>
                  <ul className="space-y-2">
                    {publicDocs.map((d) => (
                      <li key={d.id}>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 rounded-lg border border-border bg-sable-50/40 p-2.5 transition hover:border-coral-300 hover:bg-coral-50/40"
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {d.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {DOCUMENT_KIND_LABELS[d.kind]}
                              {d.fileSizeBytes
                                ? ` · ${formatBytes(d.fileSizeBytes)}`
                                : ""}
                            </p>
                          </div>
                          <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Infos pratiques */}
              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Infos pratiques
                </h3>
                <ul className="space-y-3 text-sm">
                  {shelter.visitHours && (
                    <li className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Horaires de visite</div>
                        <div className="whitespace-pre-wrap text-muted-foreground">
                          {shelter.visitHours}
                        </div>
                      </div>
                    </li>
                  )}
                  {shelter.phone && (
                    <li>
                      <a
                        href={`tel:${shelter.phone}`}
                        className="flex items-start gap-2.5 text-foreground hover:text-coral-600"
                      >
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{shelter.phone}</span>
                      </a>
                    </li>
                  )}
                  {shelter.email && (
                    <li>
                      <a
                        href={`mailto:${shelter.email}`}
                        className="flex items-start gap-2.5 text-foreground hover:text-coral-600"
                      >
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{shelter.email}</span>
                      </a>
                    </li>
                  )}
                  {shelter.website && (
                    <li>
                      <a
                        href={shelter.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2.5 text-foreground hover:text-coral-600"
                      >
                        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {shelter.website.replace(/^https?:\/\//, "")}
                        </span>
                      </a>
                    </li>
                  )}
                  {shelter.siret && (
                    <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        SIRET&nbsp;: <code>{shelter.siret}</code>
                      </span>
                    </li>
                  )}
                </ul>
              </section>

              {/* Mini-carte */}
              {shelter.location && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Où nous trouver
                  </h3>
                  <LocationView
                    latitude={shelter.location.y}
                    longitude={shelter.location.x}
                    height={220}
                    markerColor="coral"
                  />
                  <div className="mt-3">
                    <TripEstimateWidget
                      targetType="shelter"
                      targetId={shelter.id}
                    />
                  </div>
                </section>
              )}
            </aside>
          </div>

          <div className="mt-12 flex justify-end border-t border-border pt-4">
            <ReportContentDialog
              contentType="shelter"
              contentId={shelter.id}
              label="Signaler ce refuge"
              size="sm"
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatTile({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: "coral" | "lavande" | "green" | "prune";
  icon?: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    coral: "text-coral-700 bg-coral-50",
    lavande: "text-lavande-700 bg-lavande-50",
    green: "text-green-700 bg-green-50",
    prune: "text-prune-700 bg-prune-50",
  };
  return (
    <div className={`rounded-lg border border-border p-4 ${colors[accent]}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
