import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modifier un chat — Refuge",
};

export default async function EditCatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">
        Modifier le chat
      </h1>
      {/* TODO: Formulaire cat-form.tsx pré-rempli */}
      <p className="text-earth-600">
        Formulaire de modification du chat {id} à venir.
      </p>
    </div>
  );
}
