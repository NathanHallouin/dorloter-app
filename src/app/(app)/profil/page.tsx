import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon profil",
};

export default function ProfilPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">Mon profil</h1>
      {/* TODO: Formulaire profil + localisation */}
      <p className="text-earth-600">
        Votre profil et vos préférences seront affichés ici.
      </p>
    </div>
  );
}
