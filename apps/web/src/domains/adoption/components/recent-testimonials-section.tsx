import Image from "next/image";
import Link from "next/link";
import { Quote } from "lucide-react";
import { placeholderPets } from "@shared/utils/placeholder-images";
import { cn } from "@shared/utils";
import type { RecentTestimonial } from "../actions/testimonials";

const fallbackPhotos = Object.values(placeholderPets);

interface Props {
  testimonials: RecentTestimonial[];
}

/**
 * Section "Ils ont trouvé leur compagnon" pour la home publique. Met en
 * scène les témoignages publiés récents — photo de l'animal (côté refuge)
 * + photo après-adoption (côté famille) + extrait + lien vers la fiche.
 *
 * Si aucun témoignage publié, le composant retourne null pour ne pas
 * encombrer la home avec un placeholder vide.
 */
export function RecentTestimonialsSection({ testimonials }: Props) {
  if (testimonials.length === 0) return null;

  return (
    <section className="border-y border-sable-200 bg-linear-to-b from-coral-50/30 via-white to-lavande-50/30 px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
              La suite de l&apos;histoire
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ils ont trouvé leur compagnon
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Quelques nouvelles d&apos;animaux qui ont quitté leur refuge ·
              envoyées par leurs nouvelles familles.
            </p>
          </div>
          <Link
            href="/temoignages"
            className="text-sm font-semibold text-coral-600 hover:underline"
          >
            Tous les témoignages →
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <li key={t.id}>
              <Card testimonial={t} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Card({ testimonial }: { testimonial: RecentTestimonial }) {
  // Photo "avant" : la fiche refuge ; photo "après" : envoyée par la famille
  const beforeUrl =
    testimonial.pet.photoUrl ??
    fallbackPhotos[testimonial.pet.name.charCodeAt(0) % fallbackPhotos.length]!;
  const afterUrl = testimonial.photoUrl;

  // Extrait : ~140 chars max, coupé proprement
  const excerpt =
    testimonial.content.length > 140
      ? testimonial.content.slice(0, 140).trimEnd() + "…"
      : testimonial.content;

  return (
    <Link
      href={`/adopter/${testimonial.pet.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={cn(
          "relative grid",
          afterUrl ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        <div className="relative aspect-[5/3] bg-sable-100">
          <Image
            src={beforeUrl}
            alt={`${testimonial.pet.name} avant l'adoption`}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
          <span
            aria-hidden
            className="absolute left-2 top-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          >
            Refuge
          </span>
        </div>
        {afterUrl && (
          <div className="relative aspect-[5/3] bg-sable-100">
            <Image
              src={afterUrl}
              alt={`${testimonial.pet.name} chez sa nouvelle famille`}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
            />
            <span
              aria-hidden
              className="absolute left-2 top-2 rounded-sm bg-coral-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            >
              Aujourd&apos;hui
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-2">
          <Quote
            className="mt-0.5 h-4 w-4 shrink-0 text-coral-400"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-foreground">
            {excerpt}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">
              {testimonial.authorFirstName}
            </strong>
            , famille de{" "}
            <strong className="text-foreground">{testimonial.pet.name}</strong>
          </span>
          {testimonial.shelter && (
            <span className="truncate">via {testimonial.shelter.name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
