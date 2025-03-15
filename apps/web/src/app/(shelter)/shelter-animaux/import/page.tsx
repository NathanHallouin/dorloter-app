import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Upload } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { ImportWorkflow } from "./import-workflow";

export const metadata: Metadata = {
  title: "Importer un CSV · Refuge",
};

export default async function ShelterPetsImportPage() {
  await requireShelter();
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/shelter-animaux"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-coral-600"
        >
          <ChevronLeft className="h-3 w-3" />
          Retour à mes animaux
        </Link>
        <h1 className="mt-1.5 inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Upload className="h-7 w-7 text-coral-500" />
          Import CSV
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Importez en une seule fois vos animaux depuis un export Filalapat,
          Excel ou Google Sheets. Le nom est le seul champ obligatoire, les
          autres sont devinés automatiquement et restent éditables avant
          validation.
        </p>
      </div>

      <ImportWorkflow />
    </div>
  );
}
