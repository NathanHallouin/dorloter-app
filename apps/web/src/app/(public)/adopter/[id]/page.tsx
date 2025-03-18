import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@shared/ui/badge";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Separator } from "@shared/ui/separator";
import { DemoBadge } from "@shared/ui/demo-badge";
import { getPetWithDetails } from "@adoption/public";
import { FavoriteButton } from "@adoption/public";
import {
  countSponsorsForPet,
  isSponsorOfPet,
  SponsorButton,
} from "@adoption/public";
import { getCurrentSession } from "@infra/auth/session";
import { PetShare } from "@adoption/public";
import { PetPhotoGallery } from "@adoption/public";
import { PetCompatibilityPills } from "@adoption/public";
import { PetCard } from "@adoption/public";
import { PetCampaignBlock } from "@adoption/public";
import { getSimilarPets } from "@adoption/public";
import { ContactShelterButton } from "@messaging/public";
import { TripEstimateWidget } from "@/components/shared/trip-estimate-widget";
import { TestimonialDisplay } from "@adoption/public";
import { TestimonialForm } from "@adoption/public";
import { getTagsForPet, TAG_COLOR_CLASSES } from "@shelters/public";
import {
  getTestimonialContextForCat,
  getTestimonialForCat,
} from "@adoption/public";
import { ReportContentDialog } from "@moderation/public";
import { VerifiedBadge } from "@shared/ui/verified-badge";
import { TrackVisit } from "@/components/pwa/track-visit";
import { db } from "@infra/db";
import { pets } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Check, X, HelpCircle } from "lucide-react";
import { placeholderPets } from "@shared/utils/placeholder-images";

// ISR : la fiche chat est régénérée au plus une fois par heure, et les chats
// disponibles sont pré-générés au build. Les chats adoptés / retirés
// basculent en rendu à la demande (via dynamicParams default true).
export const revalidate = 3600;

export async function generateStaticParams() {
  const rows = await db
    .select({ id: pets.id })
    .from(pets)
    .where(eq(pets.status, "disponible"));
  return rows.map((r) => ({ id: r.id }));
}

const fallbackPhotos = Object.values(placeholderPets);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { title: "Animal introuvable" };
  }
  const pet = await getPetWithDetails(id);
  if (!pet) return { title: "Animal introuvable" };

  const photo = pet.photos.find((p) => p.isPrimary) ?? pet.photos[0];
  const title = `${pet.name} à adopter`;
  const description =
    pet.description ??
    `${pet.name}, ${pet.breed ?? "chat"}${pet.color ? ` ${pet.color.toLowerCase()}` : ""}, à adopter${pet.shelter ? ` auprès de ${pet.shelter.name}` : ""}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: photo ? [{ url: photo.url, alt: pet.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: photo ? [photo.url] : undefined,
    },
  };
}

const compatIcon = (value: string) => {
  if (value === "oui") return <Check className="h-4 w-4 text-green-600" />;
  if (value === "non") return <X className="h-4 w-4 text-red-500" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const pet = await getPetWithDetails(id);
  if (!pet) notFound();

  const primaryPhoto = pet.photos.find((p) => p.isPrimary) ?? pet.photos[0];

  const session = await getCurrentSession();

  // Témoignage public (si publié) + contexte utilisateur (peut-il témoigner ?)
  const [testimonial, testimonialCtx, similar, publicTags, sponsorCount, userIsSponsor] = await Promise.all([
    getTestimonialForCat(pet.id),
    getTestimonialContextForCat(pet.id),
    getSimilarPets(pet.id, {
      species: pet.species,
      ageCategory: pet.ageCategory,
      shelterId: pet.shelterId,
    }),
    getTagsForPet(pet.id).then((tags) => tags.filter((t) => t.isPublic)),
    countSponsorsForPet(pet.id),
    session ? isSponsorOfPet(session.user.id, pet.id) : Promise.resolve(false),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pet.name,
    description: pet.description ?? `${pet.name} à adopter`,
    image: pet.photos.map((p) => p.url),
    category: "Adoption d'animal",
    offers: pet.adoptionFee
      ? {
          "@type": "Offer",
          price: Number(pet.adoptionFee),
          priceCurrency: "EUR",
          availability:
            pet.status === "disponible"
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          seller: pet.shelter
            ? {
                "@type": "AnimalShelter",
                name: pet.shelter.name,
              }
            : undefined,
        }
      : undefined,
  };

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-32 md:pb-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <TrackVisit url={`/adopter/${pet.id}`} title={pet.name} />
        {pet.isDemo && <DemoBadge variant="banner" className="mb-4" />}
        {/* Galerie photos avec lightbox */}
        <PetPhotoGallery
          photos={
            pet.photos.length > 0
              ? [
                  ...(primaryPhoto ? [primaryPhoto] : []),
                  ...pet.photos.filter((p) => p.id !== primaryPhoto?.id),
                ]
              : []
          }
          fallbackUrl={
            fallbackPhotos[pet.name.charCodeAt(0) % fallbackPhotos.length]!
          }
          alt={pet.name}
        />

        <div className="grid gap-8 md:grid-cols-3">
          {/* Infos principales */}
          <div className="md:col-span-2">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-700">
                  Fiche d&apos;adoption
                </p>
                <h1 className="mt-1 text-4xl font-bold text-foreground">
                  {pet.name}
                </h1>
                {pet.shelter?.address && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pet.shelter.address}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {pet.breed && (
                    <Badge variant="secondary">{pet.breed}</Badge>
                  )}
                  {pet.ageCategory && (
                    <Badge variant="outline">
                      {pet.ageCategory === "chaton"
                        ? "Chaton"
                        : pet.ageCategory === "jeune"
                          ? "Jeune"
                          : pet.ageCategory === "adulte"
                            ? "Adulte"
                            : "Senior"}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {pet.sex === "male"
                      ? "Mâle"
                      : pet.sex === "femelle"
                        ? "Femelle"
                        : "Sexe inconnu"}
                  </Badge>
                  {pet.color && (
                    <Badge variant="outline">{pet.color}</Badge>
                  )}
                </div>
                {publicTags.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {publicTags.map((t) => {
                      const cl = TAG_COLOR_CLASSES[t.color];
                      return (
                        <li
                          key={t.id}
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${cl.bg} ${cl.text}`}
                        >
                          {t.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <PetCompatibilityPills
                  okWithCats={pet.okWithCats}
                  okWithDogs={pet.okWithDogs}
                  okWithChildren={pet.okWithChildren}
                  hideNegatives
                  className="mt-3"
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <FavoriteButton petId={pet.id} />
                <SponsorButton
                  petId={pet.id}
                  petName={pet.name}
                  initialIsSponsor={userIsSponsor}
                  initialCount={sponsorCount}
                  isSignedIn={!!session}
                />
              </div>
            </div>

            {pet.description && (
              <>
                <Separator className="my-6" />
                <div>
                  <h2 className="mb-2 text-lg font-semibold">
                    À propos de {pet.name}
                  </h2>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {pet.description}
                  </p>
                </div>
              </>
            )}

            {/* Campagne « animal en besoin » — lien externe vers la plateforme du refuge */}
            {pet.campaignUrl && (
              <>
                <Separator className="my-6" />
                <PetCampaignBlock
                  url={pet.campaignUrl}
                  title={pet.campaignTitle}
                  description={pet.campaignDescription}
                  goalAmount={pet.campaignGoalAmount}
                  collectedAmount={pet.campaignCollectedAmount}
                  petName={pet.name}
                />
              </>
            )}

            <Separator className="my-6" />

            {/* Compatibilité */}
            <div>
              <h2 className="mb-3 text-lg font-semibold">Compatibilité</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  {compatIcon(pet.okWithCats)}
                  <span className="text-sm">Chats</span>
                </div>
                <div className="flex items-center gap-2">
                  {compatIcon(pet.okWithDogs)}
                  <span className="text-sm">Chiens</span>
                </div>
                <div className="flex items-center gap-2">
                  {compatIcon(pet.okWithChildren)}
                  <span className="text-sm">Enfants</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Santé */}
            <div>
              <h2 className="mb-3 text-lg font-semibold">Santé</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {pet.isSterilized ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  Stérilisé
                </div>
                <div className="flex items-center gap-2">
                  {pet.isVaccinated ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  Vacciné
                </div>
                <div className="flex items-center gap-2">
                  {pet.isChipped ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  Pucé
                </div>
                <div className="flex items-center gap-2">
                  {pet.indoorOnly ? (
                    <Check className="h-4 w-4 text-lavande-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  Intérieur uniquement
                </div>
              </div>
              {pet.fivFelv && pet.fivFelv !== "non_teste" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  FIV/FeLV :{" "}
                  {pet.fivFelv === "negatif"
                    ? "Négatif"
                    : pet.fivFelv.replace("_", " ").replace("positif", "+")}
                </p>
              )}
            </div>

            {pet.specialNeeds && (
              <>
                <Separator className="my-6" />
                <div>
                  <h2 className="mb-2 text-lg font-semibold">
                    Besoins spécifiques
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {pet.specialNeeds}
                  </p>
                </div>
              </>
            )}

            {/* Témoignage public de l'adoptant (affiché une fois le chat adopté) */}
            {testimonial && (
              <>
                <Separator className="my-6" />
                <TestimonialDisplay
                  content={testimonial.content}
                  photoUrl={testimonial.photoUrl}
                  userName={testimonial.userName}
                  createdAt={testimonial.createdAt}
                />
              </>
            )}

            {/* Formulaire de témoignage — visible uniquement si l'user a
                une candidature acceptée sur ce chat */}
            {testimonialCtx.canTestify && (
              <>
                <Separator className="my-6" />
                <TestimonialForm
                  petId={pet.id}
                  petName={pet.name}
                  existing={testimonialCtx.existing}
                />
              </>
            )}
          </div>

          {/* Sidebar (desktop) */}
          <div className="hidden space-y-4 md:block">
            {pet.adoptionFee && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Frais d&apos;adoption
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {Number(pet.adoptionFee)} €
                  </p>
                </CardContent>
              </Card>
            )}

            <Link href={`/candidater/${pet.id}`}>
              <Button className="w-full" size="lg">
                Candidater pour {pet.name}
              </Button>
            </Link>

            <Link href={`/adopter/${pet.id}/rdv`}>
              <Button className="w-full" variant="outline" size="lg">
                Réserver une visite
              </Button>
            </Link>

            {pet.shelter && (
              <ContactShelterButton
                shelterId={pet.shelter.id}
                shelterName={pet.shelter.name}
                petId={pet.id}
                petName={pet.name}
                variant="outline"
              />
            )}

            {pet.shelter && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Refuge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <Link
                    href={`/refuges/${pet.shelter.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {pet.shelter.name}
                  </Link>
                  {pet.shelter.address && (
                    <p className="text-sm text-muted-foreground">
                      {pet.shelter.address}
                    </p>
                  )}
                  {pet.shelter.isVerified && (
                    <VerifiedBadge variant="shelter" />
                  )}
                </CardContent>
              </Card>
            )}

            <PetShare
              petId={pet.id}
              petName={pet.name}
              description={pet.description}
              breed={pet.breed}
              ageCategory={pet.ageCategory}
              shelterName={pet.shelter?.name ?? null}
              shelterAddress={pet.shelter?.address ?? null}
              photoUrl={primaryPhoto?.url ?? null}
            />
          </div>
        </div>

        {/* Bloc mobile : refuge + frais + partage */}
        <div className="mt-8 space-y-4 md:hidden">
          <div className="rounded-lg border border-border bg-card p-4">
            {pet.adoptionFee && (
              <div className="mb-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Frais d&apos;adoption
                </p>
                <p className="text-xl font-bold text-primary">
                  {Number(pet.adoptionFee)} €
                </p>
              </div>
            )}
            {pet.shelter && (
              <Link
                href={`/refuges/${pet.shelter.id}`}
                className="block text-center text-sm text-primary hover:underline"
              >
                {pet.shelter.name}
                {pet.shelter.address && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {pet.shelter.address}
                  </span>
                )}
              </Link>
            )}
            {pet.shelter && (
              <TripEstimateWidget
                targetType="shelter"
                targetId={pet.shelter.id}
              />
            )}
          </div>

          <PetShare
            petId={pet.id}
            petName={pet.name}
            description={pet.description}
            breed={pet.breed}
            ageCategory={pet.ageCategory}
            shelterName={pet.shelter?.name ?? null}
            shelterAddress={pet.shelter?.address ?? null}
            photoUrl={primaryPhoto?.url ?? null}
          />
        </div>

        {similar.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
                  Vous pourriez aimer aussi
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  D&apos;autres profils proches de {pet.name}
                </h2>
              </div>
              <Link
                href={`/adopter/liste?species=${pet.species}${
                  pet.ageCategory ? `&ageCategory=${pet.ageCategory}` : ""
                }`}
                className="text-sm font-medium text-coral-600 hover:underline"
              >
                Voir plus →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map(({ pet: p, photoUrl }) => (
                <PetCard
                  key={p.id}
                  pet={p}
                  photo={photoUrl ? { url: photoUrl } : null}
                  showFavorite={false}
                />
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex justify-end border-t border-border pt-4">
          <ReportContentDialog
            contentType="pet"
            contentId={pet.id}
            label="Signaler cette fiche"
            size="sm"
          />
        </div>
      </main>
      <Footer />

      {/* Sticky CTA mobile (au-dessus du bottom-nav) */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-lg md:hidden dark:bg-background/95">
        <Link href={`/candidater/${pet.id}`}>
          <Button className="w-full" size="lg">
            Candidater pour {pet.name}
          </Button>
        </Link>
      </div>
    </>
  );
}
