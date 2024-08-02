import { toast } from "sonner";

interface FavoriteToastInput {
  petId: string;
  petName: string | null;
  applicationsCount: number | null;
  /**
   * "verbose" toujours un toast (clic explicite),
   * "smart" uniquement quand il y a un signal fort (concurrence sur l'animal).
   */
  mode?: "verbose" | "smart";
}

/**
 * Toast contextuel après ajout aux favoris.
 *
 * - Si plusieurs candidatures sont déjà déposées sur ce pet, on alerte
 *   l'user pour qu'il n'attende pas trop avant de candidater. Affiché aussi
 *   bien en mode swipe (signal fort) qu'au clic explicite.
 * - En mode "verbose" : message de confirmation systématique.
 * - En mode "smart" (swipe) : silencieux sauf signal fort.
 */
export function showFavoriteAddedToast({
  petId,
  petName,
  applicationsCount,
  mode = "verbose",
}: FavoriteToastInput) {
  const name = petName ?? "Ce profil";

  if (applicationsCount && applicationsCount >= 3) {
    toast.success(`${name} a la cote 💛`, {
      description: `${applicationsCount} candidatures sont déjà en cours. Si vous le sentez, n'attendez pas pour postuler.`,
      action: {
        label: "Candidater",
        onClick: () => {
          window.location.href = `/candidater/${petId}`;
        },
      },
      duration: 6000,
    });
    return;
  }

  if (mode === "smart") return;

  toast.success(`${name} ajouté à vos favoris`, {
    description: "Vous le retrouverez dans votre espace personnel.",
    duration: 3500,
  });
}

export function showFavoriteRemovedToast(petName: string | null) {
  toast(`${petName ?? "Ce profil"} retiré de vos favoris`, {
    duration: 2000,
  });
}
