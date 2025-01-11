import Link from "next/link";
import Image from "next/image";
import { MapPin, Cat, Dog, Star } from "lucide-react";
import type { Pension, PensionPhoto } from "@/types";
import { placeholderCovers } from "@shared/utils/placeholder-images";
import { DemoBadge } from "@shared/ui/demo-badge";
import { PensionCompareToggle } from "./pension-compare-toggle";
import type { RatingSummary } from "../queries";

interface PensionCardProps {
  pension: Pension;
  photo?:
    | (Pick<PensionPhoto, "url"> & Partial<Pick<PensionPhoto, "blurDataUrl">>)
    | null;
  rating?: RatingSummary | null;
}

export function PensionCard({ pension, photo, rating }: PensionCardProps) {
  const src = photo?.url ?? pension.coverUrl ?? placeholderCovers.shelter;
  const hasRating = !!rating && rating.count > 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-sable-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-card">
      <Link
        href={`/pensions/${pension.slug}`}
        className="block"
        aria-label={`Voir la fiche de ${pension.name}`}
      >
        <div className="relative aspect-[5/3] bg-sable-100">
          <Image
            src={src}
            alt={pension.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder={photo?.blurDataUrl ? "blur" : "empty"}
            blurDataURL={photo?.blurDataUrl ?? undefined}
          />
          {hasRating && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-amber-700 shadow-sm backdrop-blur">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {rating.average.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                ({rating.count})
              </span>
            </span>
          )}
          {pension.isDemo && (
            <DemoBadge variant="compact" className="absolute right-2 top-2" />
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold leading-tight text-foreground">
              {pension.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
              {pension.acceptsCats && (
                <Cat className="h-4 w-4" aria-label="Accepte les chats" />
              )}
              {pension.acceptsDogs && (
                <Dog className="h-4 w-4" aria-label="Accepte les chiens" />
              )}
            </div>
          </div>
          {pension.address && (
            <p className="flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{pension.address}</span>
            </p>
          )}
          {pension.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {pension.description}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
            {pension.pricePerDayCat && pension.acceptsCats && (
              <span>Chat : {Number(pension.pricePerDayCat)} € / jour</span>
            )}
            {pension.pricePerDayDog && pension.acceptsDogs && (
              <span>Chien : {Number(pension.pricePerDayDog)} € / jour</span>
            )}
          </div>
        </div>
      </Link>

      {/* Toggle "Comparer" — hors du Link pour ne pas naviguer */}
      <div className="absolute right-2 top-2">
        <PensionCompareToggle slug={pension.slug} pensionName={pension.name} />
      </div>
    </article>
  );
}
