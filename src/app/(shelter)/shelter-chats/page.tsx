import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes chats — Refuge",
};

export default function ShelterCatsPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-earth-900">Mes chats</h1>
        <a
          href="/mes-chats/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Ajouter un chat
        </a>
      </div>
      {/* TODO: Liste des chats du refuge */}
      <p className="text-earth-600">
        La liste de vos chats sera affichée ici.
      </p>
    </div>
  );
}
