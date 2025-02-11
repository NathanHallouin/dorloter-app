import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Heart, MapPin, Scale } from "lucide-react";
import { inArray } from "drizzle-orm";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";
import { db } from "@infra/db";
import { pets, petPhotos, shelters } from "@/server/db/schema";
import { placeholderPets } from "@shared/utils/placeholder-images";

const fallbackPhotos = Object.values(placeholderPets);

export const metadata: Metadata = {
  title: "Comparer des animaux",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ ids?: string }>;
}

const SPECIES_LABEL = { chat: "Chat", chien: "Chien" } as const;
const SEX_LABEL = {
  male: "Mâle",
  femelle: "Femelle",
  inconnu: "Inconnu",
} as const;
const AGE_LABEL = {
  chaton: "Chaton",
  jeune: "Jeune",
  adulte: "Adulte",
  senior: "Senior",
} as const;
const COMPAT_LABEL = {
  oui: { txt: "Oui", color: "text-green-700", bg: "bg-green-50" },
  non: { txt: "Non", color: "text-coral-700", bg: "bg-coral-50" },
  inconnu: {
    txt: "Inconnu",
    color: "text-muted-foreground",
    bg: "bg-sable-50",
  },
} as const;
const STATUS_LABEL = {
  disponible: { txt: "Disponible", color: "bg-green-100 text-green-800" },
  reserve: { txt: "Réservé", color: "bg-lavande-100 text-lavande-800" },
  adopte: { txt: "Adopté", color: "bg-coral-100 text-coral-800" },
  retire: { txt: "Retiré", color: "bg-sable-200 text-sable-800" },
} as const;

export default async function ComparePetsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rawIds = (sp.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (rawIds.length === 0) {
    return <EmptyState />;
  }

  // Fetch séparés (3 max items, pas critique).
  const petRows = await db
    .select()
    .from(pets)
    .where(inArray(pets.id, rawIds));

  if (petRows.length === 0) {
    return <EmptyState />;
  }

  // Tri pour respecter l'ordre des ids dans la query
  const orderedPets = rawIds
    .map((id) => petRows.find((p) => p.id === id))
    .filter((p): p is (typeof petRows)[number] => !!p);

  const [photos, shelterRows] = await Promise.all([
    db
      .select()
      .from(petPhotos)
      .where(inArray(petPhotos.petId, orderedPets.map((p) => p.id))),
    db
      .select()
      .from(shelters)
      .where(inArray(shelters.id, orderedPets.map((p) => p.shelterId))),
  ]);

  const primaryPhotoByPet = new Map<string, string>();
  for (const photo of photos.filter((p) => p.isPrimary)) {
    primaryPhotoByPet.set(photo.petId, photo.url);
  }
  // Fallback : 1ʳᵉ photo si pas de primary
  for (const photo of photos) {
    if (!primaryPhotoByPet.has(photo.petId)) {
      primaryPhotoByPet.set(photo.petId, photo.url);
    }
  }
  const shelterById = new Map(shelterRows.map((s) => [s.id, s]));

  // Utilisé pour suppression unitaire dans la barre flottante (clic chip × =
  // localStorage. Ici on offre juste un lien pour retirer en query string).
  function urlWithout(petId: string): string {
    const remaining = orderedPets.filter((p) => p.id !== petId).map((p) => p.id);
    if (remaining.length === 0) return "/adopter/liste";
    return `/adopter/compare?ids=${remaining.join(",")}`;
  }

  return (
    <>
      <Navbar />
      <PageContainer variant="wide" className="space-y-6 py-10">
        <Link
          href="/adopter/liste"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour au catalogue
        </Link>

        <header className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-coral-700">
            <Scale className="h-3.5 w-3.5" />
            Comparateur
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {orderedPets.length === 1
              ? `Choisissez ${orderedPets[0]!.name}…`
              : `${orderedPets.length} profils côte à côte`}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Comparez les caractères, les compatibilités et les besoins pour
            faire un choix éclairé.
          </p>
        </header>

        {/* Grille de cartes en hauteur égale */}
        <div
          className={`grid gap-4 ${
            orderedPets.length === 1
              ? "md:grid-cols-1 max-w-md mx-auto w-full"
              : orderedPets.length === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-3"
          }`}
        >
          {orderedPets.map((pet) => {
            const shelter = shelterById.get(pet.shelterId);
            const photoUrl =
              primaryPhotoByPet.get(pet.id) ??
              fallbackPhotos[
                pet.name.charCodeAt(0) % fallbackPhotos.length
              ]!;
            const status =
              STATUS_LABEL[pet.status as keyof typeof STATUS_LABEL] ??
              STATUS_LABEL.disponible;
            const okCats =
              COMPAT_LABEL[pet.okWithCats] ?? COMPAT_LABEL.inconnu;
            const okDogs =
              COMPAT_LABEL[pet.okWithDogs] ?? COMPAT_LABEL.inconnu;
            const okChildren =
              COMPAT_LABEL[pet.okWithChildren] ?? COMPAT_LABEL.inconnu;

            return (
              <article
                key={pet.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {/* Header card */}
                <div className="relative aspect-square w-full bg-muted">
                  <Image
                    src={photoUrl}
                    alt={pet.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <Link
                    href={urlWithout(pet.id)}
                    aria-label={`Retirer ${pet.name} du comparateur`}
                    className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-foreground shadow-md backdrop-blur transition-colors hover:bg-white"
                    title="Retirer du comparateur"
                  >
                    ✕
                  </Link>
                  <span
                    className={`absolute bottom-3 left-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.color}`}
                  >
                    {status.txt}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <header>
                    <h2 className="text-xl font-bold text-foreground">
                      {pet.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {SPECIES_LABEL[pet.species]}
                      {pet.breed ? ` · ${pet.breed}` : ""}
                    </p>
                  </header>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <Cell label="Sexe" value={SEX_LABEL[pet.sex]} />
                    <Cell
                      label="Âge"
                      value={pet.ageCategory ? AGE_LABEL[pet.ageCategory] : "—"}
                    />
                    {pet.color && (
                      <Cell label="Couleur" value={pet.color} fullSpan />
                    )}
                    <Cell
                      label="Stérilisé"
                      value={pet.isSterilized ? "Oui" : "Non"}
                    />
                    <Cell label="Pucé" value={pet.isChipped ? "Oui" : "Non"} />
                    <Cell
                      label="Vacciné"
                      value={pet.isVaccinated ? "Oui" : "Non"}
                    />
                    {pet.species === "chat" && pet.fivFelv && (
                      <Cell
                        label="FIV / FELV"
                        value={pet.fivFelv.replace(/_/g, " ")}
                        fullSpan
                      />
                    )}
                    {pet.species === "chat" && pet.indoorOnly !== null && (
                      <Cell
                        label="Intérieur strict"
                        value={pet.indoorOnly ? "Oui" : "Non"}
                        fullSpan
                      />
                    )}
                  </dl>

                  {/* Compatibilités */}
                  <div className="rounded-lg border border-border bg-sable-50/40 p-2.5">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Compatibilités
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <CompatPill label="Chats" value={okCats} />
                      <CompatPill label="Chiens" value={okDogs} />
                      <CompatPill label="Enfants" value={okChildren} />
                    </div>
                  </div>

                  {/* Besoins spéciaux */}
                  {pet.specialNeeds && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Besoins spéciaux
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs text-foreground">
                        {pet.specialNeeds}
                      </p>
                    </div>
                  )}

                  {/* Refuge + adresse */}
                  {shelter && (
                    <div className="mt-auto border-t border-border pt-3">
                      <p className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="flex-1 truncate">
                          <Link
                            href={`/refuges/${shelter.id}`}
                            className="font-medium text-foreground hover:text-coral-600"
                          >
                            {shelter.name}
                          </Link>
                          {shelter.address && (
                            <>
                              <br />
                              {shelter.address}
                            </>
                          )}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Prix + CTA */}
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                    {pet.adoptionFee ? (
                      <p className="text-sm">
                        Frais d&apos;adoption :{" "}
                        <strong className="text-coral-700">
                          {Number(pet.adoptionFee)} €
                        </strong>
                      </p>
                    ) : (
                      <span />
                    )}
                    <Link
                      href={`/adopter/${pet.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-coral-600"
                    >
                      <Heart className="h-3 w-3" />
                      Sa fiche
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </PageContainer>
      <Footer />
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function Cell({
  label,
  value,
  fullSpan,
}: {
  label: string;
  value: string;
  fullSpan?: boolean;
}) {
  return (
    <div className={fullSpan ? "col-span-2" : ""}>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function CompatPill({
  label,
  value,
}: {
  label: string;
  value: { txt: string; color: string; bg: string };
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 ${value.bg}`}
    >
      <span className={`text-sm font-bold ${value.color}`}>{value.txt}</span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <>
      <Navbar />
      <PageContainer variant="wide" className="py-20 text-center">
        <Scale className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Aucun animal sélectionné
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajoutez des animaux au comparateur depuis le catalogue d&apos;adoption.
        </p>
        <Link
          href="/adopter/liste"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600"
        >
          Aller au catalogue
        </Link>
      </PageContainer>
      <Footer />
    </>
  );
}
