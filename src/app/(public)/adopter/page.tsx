import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CatalogModeToggle, PetSwipeDeck } from "@adoption/public";
import { getSwipeablePets } from "@adoption/public";
import { getCurrentSession } from "@infra/auth/session";

export const metadata: Metadata = {
  title: "Adopter un animal",
  description:
    "Chats et chiens à adopter en mode carte : swipez à droite ce qui vous plaît, passez ce qui ne vous correspond pas. Vue liste avec filtres également disponible.",
  alternates: { canonical: "/adopter" },
  openGraph: {
    title: "Adopter un animal — Dorloter",
    description:
      "Découvrez les chats et chiens à adopter chez les refuges partenaires. Mode swipe ou liste filtrable, partout en France.",
    url: "/adopter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adopter un animal — Dorloter",
    description:
      "Trouvez votre prochain compagnon chez les refuges partenaires de Dorloter.",
  },
};

export default async function AdopterPage() {
  const session = await getCurrentSession();
  const entries = await getSwipeablePets(session?.user.id ?? null, 30);

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mx-auto max-w-sm">
          <header className="mb-6">
            <div className="mb-3 flex justify-center">
              <CatalogModeToggle mode="swipe" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                À adopter près de vous
              </h1>
              <p className="text-sm text-muted-foreground">
                {entries.length === 0
                  ? "rien de nouveau aujourd'hui"
                  : `${entries.length} ${entries.length > 1 ? "profils" : "profil"} à voir`}
              </p>
            </div>
          </header>

          {!session && entries.length > 0 && (
            <div className="mb-4 rounded-md bg-coral-50 p-3 text-xs text-coral-800">
              Sans compte, vos oui partent dans le vide. Pour les garder :{" "}
              <Link
                href="/login?callbackUrl=/adopter"
                className="font-medium underline"
              >
                se connecter
              </Link>
              .
            </div>
          )}

          <PetSwipeDeck pets={entries} />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Glissez à droite pour garder, à gauche pour passer.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
