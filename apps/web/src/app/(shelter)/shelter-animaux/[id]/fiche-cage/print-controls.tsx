"use client";

import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";

interface PrintControlsProps {
  petId: string;
  currentFormat: string;
  formats: Array<{ key: string; label: string }>;
}

export function PrintControls({
  petId,
  currentFormat,
  formats,
}: PrintControlsProps) {
  return (
    <div className="fiche-controls sticky top-0 z-50 border-b border-border bg-card/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link
          href="/shelter-animaux"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à mes animaux
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Format
          </span>
          {formats.map((f) => {
            const active = f.key === currentFormat;
            const href =
              f.key === "a6"
                ? `/shelter-animaux/${petId}/fiche-cage`
                : `/shelter-animaux/${petId}/fiche-cage?format=${f.key}`;
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
        Astuce : imprimez ces fiches pour coller sur les cages de votre
        refuge. Les visiteurs scannent le QR code et voient la fiche en
        ligne, peuvent candidater directement.
      </p>
    </div>
  );
}
