import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";
import { cn } from "@shared/utils";
import { PensionReviewForm } from "./pension-review-form";
import type { PensionReviewWithAuthor, RatingSummary } from "../queries";

interface Props {
  pensionId: string;
  pensionName: string;
  reviews: PensionReviewWithAuthor[];
  rating: RatingSummary | null;
  isAuthed: boolean;
  existing: PensionReviewWithAuthor | null;
  canSubmit: boolean;
  hasContact: boolean;
}

/**
 * Section "Avis" de la fiche pension. Affiche :
 *   - le résumé (moyenne + nombre d'avis), avec ancrage `#avis`
 *   - la liste des avis publiés
 *   - le formulaire si l'utilisateur peut en laisser un
 *   - une invitation à se connecter sinon
 */
export function PensionReviewsSection({
  pensionId,
  pensionName,
  reviews,
  rating,
  isAuthed,
  existing,
  canSubmit,
  hasContact,
}: Props) {
  return (
    <section id="avis" className="space-y-6 scroll-mt-20">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Avis
          </h2>
          {rating && rating.count > 0 ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <strong className="text-foreground">
                {rating.average.toFixed(1)}
              </strong>{" "}
              sur 5 — {rating.count} avis publié
              {rating.count > 1 ? "s" : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun avis pour le moment. Si vous avez confié votre animal à
              cette pension, votre retour aide les autres familles.
            </p>
          )}
        </div>
      </header>

      {reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}

      {!isAuthed ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center text-sm">
          <p className="text-foreground">
            Vous avez fait garder votre animal ici ?{" "}
            <Link
              href={`/login?callbackUrl=/pensions/${pensionId}#avis`}
              className="font-semibold text-coral-600 hover:underline"
            >
              Connectez-vous
            </Link>{" "}
            pour laisser un avis.
          </p>
        </div>
      ) : canSubmit ? (
        <PensionReviewForm
          pensionId={pensionId}
          pensionName={pensionName}
          hasContact={hasContact}
        />
      ) : existing ? (
        <PensionReviewForm
          pensionId={pensionId}
          pensionName={pensionName}
          hasContact={hasContact}
          initialRating={existing.rating}
          initialComment={existing.comment}
        />
      ) : null}
    </section>
  );
}

function ReviewItem({ review }: { review: PensionReviewWithAuthor }) {
  const initials = review.authorName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-coral-50">
          {/* Avatar text-only — on évite Image pour ne pas charger n hôtes externes */}
          <span className="flex h-full items-center justify-center text-sm font-semibold text-coral-700">
            {initials || "?"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="font-semibold text-foreground">
              {review.authorName}
            </p>
            {review.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                <ShieldCheck className="h-3 w-3" />
                Avis vérifié
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div
            className="mt-1 flex items-center gap-0.5"
            aria-label={`${review.rating} étoile${review.rating > 1 ? "s" : ""} sur 5`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "h-4 w-4",
                  n <= review.rating
                    ? "fill-amber-500 text-amber-500"
                    : "text-sable-300"
                )}
                aria-hidden
              />
            ))}
          </div>
          {review.comment && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
