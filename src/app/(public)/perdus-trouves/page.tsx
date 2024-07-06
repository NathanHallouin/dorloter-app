import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Chats perdus & trouvés",
  description:
    "Signalez un chat perdu ou trouvé. Notre système géolocalisé rapproche automatiquement les signalements pour retrouver les chats.",
};

export default function PerdusTrouvesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-earth-900">
          Chats perdus & trouvés
        </h1>
        {/* TODO: Carte interactive + liste de signalements */}
        <p className="text-earth-600">
          La carte des signalements et la liste seront affichées ici.
        </p>
      </main>
      <Footer />
    </>
  );
}
