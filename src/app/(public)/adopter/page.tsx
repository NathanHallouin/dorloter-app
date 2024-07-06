import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Adopter un chat",
  description:
    "Parcourez les profils de chats à adopter dans les refuges partenaires. Filtrez par race, âge, sexe et compatibilité.",
};

export default function AdopterPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-earth-900">
          Chats à adopter
        </h1>
        {/* TODO: Filtres + grille de cat-cards */}
        <p className="text-earth-600">
          Le catalogue de chats à adopter sera affiché ici avec filtres et
          pagination.
        </p>
      </main>
      <Footer />
    </>
  );
}
