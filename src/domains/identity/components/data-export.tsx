"use client";

import { Download } from "lucide-react";
import { buttonVariants } from "@shared/ui/button";
import { cn } from "@shared/utils";

/**
 * Bouton d'export RGPD. L'endpoint renvoie un JSON avec
 * `Content-Disposition: attachment` → le navigateur télécharge direct,
 * pas besoin d'état client ni de polling.
 */
export function DataExportSection() {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">
        Exporter mes données
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Téléchargez un fichier JSON avec toutes les données que Dorloter détient
        sur vous : profil, signalements, candidatures, favoris, refuges
        suivis, notifications, sessions. Conforme aux articles 15 et 20 du
        RGPD (droit d&apos;accès et de portabilité).
      </p>
      <a
        href="/api/profile/export"
        download
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-4 gap-1.5"
        )}
      >
        <Download className="h-4 w-4" />
        Télécharger mes données (JSON)
      </a>
    </section>
  );
}
