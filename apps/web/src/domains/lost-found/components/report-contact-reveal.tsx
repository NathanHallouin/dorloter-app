"use client";

import { useState, useTransition } from "react";
import { Mail, Phone, ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";
import { revealReportContact } from "../actions/contact";

interface Props {
  reportId: string;
  /**
   * Indicateurs serveur — la fiche serveur sait s'il y a un téléphone et/ou
   * un email sans envoyer leur valeur. On affiche le bon CTA selon ce qui
   * existe.
   */
  hasPhone: boolean;
  hasEmail: boolean;
}

/**
 * Section "Contact" de la fiche signalement, masquée par défaut.
 *
 * Comportement :
 *   - Au chargement : pas de phone/email dans le DOM, juste un bouton
 *     « Voir les coordonnées » + courte explication anti-scraping.
 *   - Au clic : appel à `revealReportContact` (rate-limité serveur),
 *     puis affichage des liens tel:/mailto:.
 *   - Persistance : la valeur reste affichée tant que l'utilisateur reste
 *     sur la page. Pas de cache local — chaque visite redemande.
 */
export function ReportContactReveal({ reportId, hasPhone, hasEmail }: Props) {
  const [revealed, setRevealed] = useState<{
    phone: string | null;
    email: string | null;
  } | null>(null);
  const [pending, start] = useTransition();

  if (!hasPhone && !hasEmail) return null;

  function handleReveal() {
    start(async () => {
      const res = await revealReportContact(reportId);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Impossible d'afficher les coordonnées.");
        return;
      }
      setRevealed(res.data);
    });
  }

  if (!revealed) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-foreground">Contact</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Les coordonnées sont masquées par défaut pour limiter le
              démarchage et le scraping.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReveal}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Lock className="h-3.5 w-3.5" />
          {pending ? "Vérification…" : "Afficher les coordonnées"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-semibold text-foreground">Contact</h3>
      <div className="space-y-2 text-sm">
        {revealed.phone && (
          <a
            href={`tel:${revealed.phone}`}
            className="flex items-center gap-2 text-foreground transition hover:text-coral-600"
          >
            <Phone className="h-4 w-4" />
            {revealed.phone}
          </a>
        )}
        {revealed.email && (
          <a
            href={`mailto:${revealed.email}`}
            className="flex items-center gap-2 text-foreground transition hover:text-coral-600"
          >
            <Mail className="h-4 w-4" />
            {revealed.email}
          </a>
        )}
      </div>
      <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
        Présentez-vous calmement. Si l&apos;animal est manifestement le
        bon, demandez à confirmer un signe distinctif avant le rendez-vous.
      </p>
    </div>
  );
}
