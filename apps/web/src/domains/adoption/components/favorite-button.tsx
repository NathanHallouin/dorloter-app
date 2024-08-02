"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@adoption/actions/favorites";
import {
  showFavoriteAddedToast,
  showFavoriteRemovedToast,
} from "../lib/favorite-toast";

interface FavoriteButtonProps {
  petId: string;
  /** Valeur connue côté serveur. Si omise, le composant fetch son état au mount. */
  initialFavorite?: boolean;
}

export function FavoriteButton({ petId, initialFavorite }: FavoriteButtonProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialFavorite ?? false);
  const [hydrated, setHydrated] = useState(initialFavorite !== undefined);
  const [authed, setAuthed] = useState(initialFavorite !== undefined);
  const [isPending, startTransition] = useTransition();

  // Hydrate l'état depuis l'API si on n'a pas reçu la valeur côté serveur.
  // Permet à la page détail de rester en SSG/ISR.
  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    fetch(`/api/favorites/${petId}`)
      .then((r) => r.json())
      .then((data: { favorite: boolean; authed: boolean }) => {
        if (cancelled) return;
        setIsFavorite(data.favorite);
        setAuthed(data.authed);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => {
      cancelled = true;
    };
  }, [petId, hydrated]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Non connecté → redirige vers login
    if (hydrated && !authed) {
      router.push(`/login?callbackUrl=/adopter/${petId}`);
      return;
    }

    startTransition(async () => {
      const result = await toggleFavorite(petId);
      if (result.success && result.data) {
        setIsFavorite(result.data.isFavorite);
        if (result.data.isFavorite) {
          showFavoriteAddedToast({
            petId,
            petName: result.data.petName,
            applicationsCount: result.data.applicationsCount,
            mode: "verbose",
          });
        } else {
          showFavoriteRemovedToast(result.data.petName);
        }
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !hydrated}
      className="rounded-full bg-white/80 p-2 shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-card/80 dark:hover:bg-card"
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          isFavorite
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground"
        }`}
      />
    </button>
  );
}
