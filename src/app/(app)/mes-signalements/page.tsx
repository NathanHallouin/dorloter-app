import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes signalements",
};

export default function MesSignalementsPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">
        Mes signalements
      </h1>
      {/* TODO: Liste des signalements actifs */}
      <p className="text-earth-600">
        Vos signalements actifs seront affichés ici.
      </p>
    </div>
  );
}
