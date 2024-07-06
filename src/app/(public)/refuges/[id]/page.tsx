import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Refuge",
};

export default async function ShelterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold text-earth-900">Refuge</h1>
        {/* TODO: Page refuge + ses chats */}
        <p className="text-earth-600">Page du refuge {id} à venir.</p>
      </main>
      <Footer />
    </>
  );
}
