import { Navbar } from "@/components/layout/navbar";

export default function ShelterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Vérifier session + rôle shelter_admin
  return (
    <>
      <Navbar />
      <div className="mx-auto flex max-w-7xl flex-1 gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="flex flex-col gap-2 text-sm">
            <a
              href="/shelter-chats"
              className="rounded-md px-3 py-2 text-earth-700 hover:bg-cream-100"
            >
              Mes chats
            </a>
            <a
              href="/shelter-candidatures"
              className="rounded-md px-3 py-2 text-earth-700 hover:bg-cream-100"
            >
              Candidatures
            </a>
            <a
              href="/shelter-stats"
              className="rounded-md px-3 py-2 text-earth-700 hover:bg-cream-100"
            >
              Statistiques
            </a>
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
