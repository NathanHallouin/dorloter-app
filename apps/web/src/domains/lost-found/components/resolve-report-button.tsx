"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, PartyPopper } from "lucide-react";
import { Button } from "@shared/ui/button";
import { markReportResolved } from "@lost-found/actions/resolve";

/**
 * Bouton "Ce chat a été retrouvé" — affiché sur le détail d'un signalement,
 * visible uniquement pour l'auteur si le status est encore 'actif'.
 * Demande une confirmation avant de marquer résolu (action irréversible
 * pour le compteur de retrouvailles).
 */
export function ResolveReportButton({
  reportId,
  type,
}: {
  reportId: string;
  type: "perdu" | "trouve";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    start(async () => {
      const res = await markReportResolved(reportId);
      if (!res.success) {
        toast.error(res.error ?? "Échec de la résolution.");
        setConfirming(false);
        return;
      }
      toast.success("Signalement marqué comme résolu. Merci !");
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-2.5">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-green-900">
              {type === "perdu"
                ? "Votre chat a bien été retrouvé ?"
                : "Le chat a bien été rendu à sa famille ?"}
            </p>
            <p className="text-xs text-green-800">
              Le signalement sera clôturé et les contributeurs qui ont aidé à
              cette retrouvaille verront leur compteur s&apos;incrémenter.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleClick}
                disabled={pending}
                className="gap-1.5 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                {pending ? "Enregistrement…" : "Oui, confirmer"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      variant="outline"
      className="w-full gap-1.5 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
    >
      <PartyPopper className="h-4 w-4" />
      {type === "perdu"
        ? "Mon chat a été retrouvé"
        : "Le chat a été rendu à sa famille"}
    </Button>
  );
}
