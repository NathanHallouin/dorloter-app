import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Détail signalement",
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold text-earth-900">
          Détail du signalement
        </h1>
        {/* TODO: Détail signalement + correspondances */}
        <p className="text-earth-600">
          Détail du signalement {id} et ses correspondances à venir.
        </p>
      </main>
      <Footer />
    </>
  );
}
