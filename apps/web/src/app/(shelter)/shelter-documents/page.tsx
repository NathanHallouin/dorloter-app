import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { getDocumentsForShelter } from "@shelters/public";
import { DocumentsManager } from "./documents-manager";

export const metadata: Metadata = {
  title: "Documents · Refuge",
};

export default async function ShelterDocumentsPage() {
  const session = await requireShelter();
  const documents = await getDocumentsForShelter(session.user.shelterId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <FolderOpen className="h-7 w-7 text-coral-500" />
          Documents du refuge
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Statuts, agréments, conventions, contrats d&apos;adoption type :
          centralisez vos documents administratifs. Marquez <strong>public</strong>
          ceux qui peuvent apparaître sur votre fiche refuge accessible aux
          futurs adoptants. Plafond 30 documents.
        </p>
      </header>

      <DocumentsManager initialDocuments={documents} />
    </div>
  );
}
