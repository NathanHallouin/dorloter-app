import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center gap-8 px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="text-amber-600">Miaou</span> — Chaque chat mérite
            un foyer
          </h1>
          <p className="max-w-2xl text-lg text-earth-600">
            Adoptez un chat dans un refuge près de chez vous, ou aidez un chat
            perdu à retrouver sa famille grâce à notre réseau de signalements
            géolocalisés.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/adopter"
              className="rounded-lg bg-teal-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Adopter un chat
            </Link>
            <Link
              href="/perdus-trouves"
              className="rounded-lg border-2 border-amber-500 px-8 py-3 font-semibold text-amber-700 transition-colors hover:bg-amber-50"
            >
              Perdus / Trouvés
            </Link>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section className="bg-cream-100 px-4 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-amber-700">
                Adoption simplifiée
              </h3>
              <p className="text-earth-600">
                Parcourez les profils de chats à adopter, filtrez par race, âge,
                compatibilité. Candidatez en quelques clics.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-teal-700">
                Matching intelligent
              </h3>
              <p className="text-earth-600">
                Notre algorithme rapproche automatiquement les signalements de
                chats perdus et trouvés par localisation et description.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-amber-700">
                Refuges partenaires
              </h3>
              <p className="text-earth-600">
                Les refuges et associations gèrent leurs chats, reçoivent les
                candidatures et suivent les adoptions en temps réel.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
