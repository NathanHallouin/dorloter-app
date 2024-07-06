import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajouter un chat — Refuge",
};

export default function NewCatPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">
        Ajouter un chat
      </h1>
      {/* TODO: Formulaire cat-form.tsx */}
      <p className="text-earth-600">
        Le formulaire d&apos;ajout de chat sera affiché ici.
      </p>
    </div>
  );
}
