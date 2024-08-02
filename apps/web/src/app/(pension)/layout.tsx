import { Navbar } from "@/components/layout/navbar";
import { requirePension } from "@infra/auth/session";

export default async function PensionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePension();
  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="flex flex-col gap-2 text-sm">
            <a
              href="/pension-profil"
              className="rounded-md px-3 py-2 text-foreground hover:bg-sable-100"
            >
              Profil de la pension
            </a>
          </nav>
        </aside>
        <main id="main" className="flex-1">{children}</main>
      </div>
    </>
  );
}
