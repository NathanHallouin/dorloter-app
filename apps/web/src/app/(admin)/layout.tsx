import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { requirePlatformAdmin } from "@infra/auth/session";
import { ShieldCheck, Flag, Home, Users } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();
  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Espace plateforme
          </p>
          <nav className="flex flex-col gap-1 text-sm">
            <NavLink href="/admin" icon={<Home className="h-4 w-4" />}>
              Tableau de bord
            </NavLink>
            <NavLink
              href="/admin/moderation"
              icon={<Flag className="h-4 w-4" />}
            >
              File de modération
            </NavLink>
            <NavLink
              href="/admin/shelters"
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              Vérification refuges
            </NavLink>
            <NavLink
              href="/admin/users"
              icon={<Users className="h-4 w-4" />}
            >
              Utilisateurs
            </NavLink>
          </nav>
        </aside>
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-foreground hover:bg-sable-100"
    >
      {icon}
      {children}
    </Link>
  );
}
