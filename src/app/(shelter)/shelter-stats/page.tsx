import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistiques — Refuge",
};

export default function ShelterStatsPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">Statistiques</h1>
      {/* TODO: Dashboard stats refuge */}
      <p className="text-earth-600">
        Les statistiques du refuge seront affichées ici (vues, candidatures,
        adoptions).
      </p>
    </div>
  );
}
