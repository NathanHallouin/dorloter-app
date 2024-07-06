import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">
        Tableau de bord
      </h1>
      {/* TODO: Favoris, signalements, candidatures */}
      <p className="text-earth-600">
        Vos favoris, signalements et candidatures seront affichés ici.
      </p>
    </div>
  );
}
