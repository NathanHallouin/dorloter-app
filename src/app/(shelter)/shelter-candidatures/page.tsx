import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidatures reçues — Refuge",
};

export default function ShelterCandidaturesPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">
        Candidatures reçues
      </h1>
      {/* TODO: Liste des candidatures reçues */}
      <p className="text-earth-600">
        Les candidatures reçues seront affichées ici.
      </p>
    </div>
  );
}
