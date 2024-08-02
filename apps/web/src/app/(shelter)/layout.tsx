import { Navbar } from "@/components/layout/navbar";
import { requireShelter } from "@infra/auth/session";

export default async function ShelterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireShelter();
  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="flex flex-col gap-2 text-sm">
            <a
              href="/shelter-animaux"
              className="rounded-md px-3 py-2 text-foreground hover:bg-sable-100"
            >
              Mes animaux
            </a>
            <a
              href="/shelter-candidatures"
              className="rounded-md px-3 py-2 text-foreground hover:bg-sable-100"
            >
              Candidatures
            </a>
            <a
              href="/shelter-messages"
              className="rounded-md px-3 py-2 text-foreground hover:bg-sable-100"
            >
              Messages
            </a>
            <a
              href="/shelter-stats"
              className="rounded-md px-3 py-2 text-foreground hover:bg-sable-100"
            >
              Statistiques
            </a>
            <a
              href="/shelter-profil"
              className="rounded-md px-3 py-2 text-foreground hover:bg-sable-100"
            >
              Profil du refuge
            </a>
          </nav>
        </aside>
        <main id="main" className="flex-1">{children}</main>
      </div>
    </>
  );
}
