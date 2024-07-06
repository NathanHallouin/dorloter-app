import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes candidatures",
};

export default function CandidaturesPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">
        Mes candidatures
      </h1>
      {/* TODO: Liste des candidatures avec statut */}
      <p className="text-earth-600">
        Vos candidatures d&apos;adoption seront affichées ici.
      </p>
    </div>
  );
}
