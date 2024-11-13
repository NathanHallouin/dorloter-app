import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Cat, Dog, MapPin, Clock, Star } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";
import { VerifiedBadge } from "@shared/ui/verified-badge";
import {
  getPensionWithPhotos,
  getRatingSummariesForPensions,
  getPensionReviews,
  getReviewContext,
  PensionContactButtons,
  PensionMobileCallCta,
  PensionReviewsSection,
} from "@pensions/public";
import { LocationView } from "@/components/map/location-view";
import { placeholderCovers } from "@shared/utils/placeholder-images";
import { getCurrentSession } from "@infra/auth/session";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pension = await getPensionWithPhotos(slug);
  if (!pension) return { title: "Pension introuvable" };
  return {
    title: pension.name,
    description:
      pension.description?.slice(0, 160) ??
      `${pension.name} · pension professionnelle agréée pour ${
        pension.acceptsCats && pension.acceptsDogs
          ? "chats et chiens"
          : pension.acceptsCats
            ? "chats"
            : "chiens"
      }.`,
  };
}

const SERVICE_LABELS: Record<string, string> = {
  medication: "Administration de médicaments",
  grooming: "Toilettage",
  outdoorAccess: "Accès extérieur sécurisé",
  nightStaff: "Présence de nuit",
  transport: "Transport aller/retour",
  senior: "Soins adaptés seniors",
};

export default async function PensionPage({ params }: Props) {
  const { slug } = await params;
  const pension = await getPensionWithPhotos(slug);
  if (!pension || !pension.isVerified) notFound();

  const cover =
    pension.coverUrl ?? pension.photos[0]?.url ?? placeholderCovers.shelter;

  const services = (pension.services ?? {}) as Record<string, boolean>;
  const activeServices = Object.entries(services)
    .filter(([, v]) => v === true)
    .map(([k]) => SERVICE_LABELS[k])
    .filter(Boolean);

  const session = await getCurrentSession();
  const [ratingSummaries, reviews, reviewContext] = await Promise.all([
    getRatingSummariesForPensions([pension.id]),
    getPensionReviews(pension.id, 30),
    session
      ? getReviewContext(pension.id, session.user.id)
      : Promise.resolve({ existing: null, canSubmit: false, hasContact: false }),
  ]);
  const rating = ratingSummaries.get(pension.id) ?? null;

  return (
    <>
      <Navbar />
      <div className="relative h-56 w-full overflow-hidden bg-sable-100 sm:h-72">
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>

      <PageContainer variant="wide" className="space-y-10 py-10 pb-32 md:pb-10">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {pension.name}
            </h1>
            <VerifiedBadge variant="pension" />
            {rating && rating.count > 0 && (
              <a
                href="#avis"
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {rating.average.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  · {rating.count} avis
                </span>
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {pension.acceptsCats && (
              <span className="inline-flex items-center gap-1">
                <Cat className="h-4 w-4" />
                Chats
                {pension.capacityCats ? ` · jusqu'à ${pension.capacityCats}` : ""}
              </span>
            )}
            {pension.acceptsDogs && (
              <span className="inline-flex items-center gap-1">
                <Dog className="h-4 w-4" />
                Chiens
                {pension.capacityDogs ? ` · jusqu'à ${pension.capacityDogs}` : ""}
              </span>
            )}
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-8">
            {pension.description && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">La pension</h2>
                <p className="whitespace-pre-line leading-relaxed text-foreground">
                  {pension.description}
                </p>
              </div>
            )}

            {activeServices.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Services proposés</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {activeServices.map((label) => (
                    <li
                      key={label}
                      className="rounded-lg border border-sable-200 bg-white px-3 py-2 text-sm text-foreground"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pension.photos.length > 1 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Galerie</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {pension.photos.map((p) => (
                    <div
                      key={p.id}
                      className="relative aspect-square overflow-hidden rounded-xl bg-sable-100"
                    >
                      <Image
                        src={p.url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5 self-start rounded-2xl border border-sable-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">Tarifs</h3>
              <div className="space-y-0.5 text-sm text-foreground">
                {pension.acceptsCats && pension.pricePerDayCat && (
                  <p>Chat : {Number(pension.pricePerDayCat)} € / jour</p>
                )}
                {pension.acceptsDogs && pension.pricePerDayDog && (
                  <p>Chien : {Number(pension.pricePerDayDog)} € / jour</p>
                )}
                {!pension.pricePerDayCat && !pension.pricePerDayDog && (
                  <p className="text-muted-foreground">Sur demande</p>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-sable-200 pt-4">
              <h3 className="text-sm font-semibold text-foreground">Contact</h3>
              <PensionContactButtons
                pensionId={pension.id}
                phone={pension.phone}
                email={pension.email}
                website={pension.website}
              />
            </div>

            {pension.openingHours && (
              <div className="space-y-2 border-t border-sable-200 pt-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4" />
                  Horaires
                </h3>
                <p className="whitespace-pre-line text-sm text-foreground">
                  {pension.openingHours}
                </p>
              </div>
            )}

            {pension.address && (
              <div className="space-y-2 border-t border-sable-200 pt-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4" />
                  Adresse
                </h3>
                <p className="text-sm text-foreground">{pension.address}</p>
              </div>
            )}

            <p className="border-t border-sable-200 pt-4 text-xs text-muted-foreground">
              SIRET&nbsp;: {pension.siret}
              {pension.agrementNumber && (
                <>
                  <br />
                  Agrément&nbsp;: {pension.agrementNumber}
                </>
              )}
            </p>
          </aside>
        </section>

        {pension.location && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Emplacement</h2>
            <LocationView
              latitude={pension.location.y}
              longitude={pension.location.x}
            />
          </section>
        )}

        <PensionReviewsSection
          pensionId={pension.id}
          pensionName={pension.name}
          reviews={reviews}
          rating={rating}
          isAuthed={!!session}
          existing={reviewContext.existing}
          canSubmit={reviewContext.canSubmit}
          hasContact={reviewContext.hasContact}
        />

        <div className="border-t border-sable-200 pt-6 text-xs text-muted-foreground">
          <Link href="/pensions" className="hover:text-coral-600">
            ← Toutes les pensions
          </Link>
        </div>
      </PageContainer>
      <PensionMobileCallCta
        pensionId={pension.id}
        phone={pension.phone}
        email={pension.email}
      />
      <Footer />
    </>
  );
}
