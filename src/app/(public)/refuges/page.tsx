import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Refuges partenaires",
  description:
    "Découvrez les refuges et associations partenaires de Miaou. Consultez leurs chats à adopter.",
};

export default function RefugesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-earth-900">
          Refuges partenaires
        </h1>
        {/* TODO: Annuaire des refuges */}
        <p className="text-earth-600">
          L&apos;annuaire des refuges partenaires sera affiché ici.
        </p>
      </main>
      <Footer />
    </>
  );
}
