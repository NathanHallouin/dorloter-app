"use client";

import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";

interface PrintControlsProps {
  reportId: string;
  currentFormat: string;
  formats: Array<{ key: string; label: string }>;
}

/**
 * Barre de contrôles sticky pour l'écran (cachée à l'impression via
 * `.affiche-controls`). Permet de choisir le format et de déclencher
 * l'impression. L'utilisateur peut alors choisir "Enregistrer en PDF"
 * dans la boîte d'impression de son navigateur.
 */
export function PrintControls({
  reportId,
  currentFormat,
  formats,
}: PrintControlsProps) {
  return (
    <div className="affiche-controls sticky top-0 z-50 border-b border-border bg-card/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link
          href={`/perdus-trouves/${reportId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à la fiche
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Format
          </span>
          {formats.map((f) => {
            const active = f.key === currentFormat;
            const href =
              f.key === "a4"
                ? `/perdus-trouves/${reportId}/affiche`
                : `/perdus-trouves/${reportId}/affiche?format=${f.key}`;
            return (
              <Link
                key={f.key}
                href={href}
                aria-current={active ? "true" : undefined}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-coral-500 text-white shadow-sm"
                    : "border border-border bg-card text-foreground hover:border-coral-300"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600"
        >
          <Printer className="h-4 w-4" />
          Imprimer · enregistrer PDF
        </button>
      </div>

      <p className="mx-auto mt-2 max-w-5xl text-center text-[11px] text-muted-foreground">
        Astuce : dans la boîte d&apos;impression, choisissez « Enregistrer en
        PDF » comme destination pour télécharger le fichier.
      </p>
    </div>
  );
}
