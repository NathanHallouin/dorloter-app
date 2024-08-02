"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import { cn } from "@shared/utils";
import { submitPensionReview } from "../actions/reviews";

interface Props {
  pensionId: string;
  pensionName: string;
  hasContact: boolean;
  initialRating?: number;
  initialComment?: string | null;
}

/**
 * Formulaire de notation d'une pension.
 *
 * - Note 1-5 obligatoire (pickers étoiles)
 * - Commentaire libre optionnel
 * - Le badge "vérifié" est ajouté côté serveur si l'auteur a un contact
 *   tracké < 90 jours sur cette pension. On informe l'user du statut
 *   probable mais le serveur a le dernier mot.
 */
export function PensionReviewForm({
  pensionId,
  pensionName,
  hasContact,
  initialRating,
  initialComment,
}: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState(initialComment ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (rating < 1) {
      toast.error("Choisissez une note de 1 à 5.");
      return;
    }
    startTransition(async () => {
      const res = await submitPensionReview(pensionId, { rating, comment });
      if (!res.success) {
        toast.error(res.error ?? "Impossible d'enregistrer l'avis.");
        return;
      }
      toast.success(
        res.data?.isVerified
          ? `Merci. Votre avis sur ${pensionName} est publié, marqué "vérifié".`
          : `Merci. Votre avis sur ${pensionName} est publié.`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="font-semibold text-foreground">
          {initialRating ? "Mettre à jour mon avis" : "Laisser un avis"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Soyez factuel·le, sur ce que vous avez réellement vécu.
          {hasContact ? (
            <>
              {" "}
              Votre avis sera marqué{" "}
              <strong className="text-green-700">« vérifié »</strong> car nous
              avons un contact récent entre vous et cette pension.
            </>
          ) : (
            <>
              {" "}
              Pour qu&apos;il soit marqué « vérifié », contactez d&apos;abord
              la pension via les boutons ci-dessus.
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="rounded-md p-1 transition hover:bg-muted"
            >
              <Star
                className={cn(
                  "h-7 w-7",
                  filled
                    ? "fill-amber-500 text-amber-500"
                    : "text-sable-300"
                )}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm text-muted-foreground">
          {rating === 0
            ? "Cliquez pour noter"
            : ["Très décevant", "Décevant", "Correct", "Bien", "Excellent"][
                rating - 1
              ]}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Commentaire (optionnel)</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Accueil, propreté, prise en charge de l'animal, communication…"
        />
        <p className="text-xs text-muted-foreground">
          {comment.length} / 2000
        </p>
      </div>

      <Button onClick={submit} disabled={pending || rating === 0}>
        {pending
          ? "Envoi…"
          : initialRating
            ? "Mettre à jour"
            : "Publier l'avis"}
      </Button>
    </div>
  );
}
