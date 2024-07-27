import Link from "next/link";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { UserNav } from "./user-nav";
import { MobileMenu } from "./mobile-menu";
import { LogoLink } from "./logo-link";
import { NotificationBell } from "@notifications/public";
import { MessagesNavLink } from "@messaging/public";

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <header className="sticky top-0 z-50 border-b border-sable-200/80 bg-white/80 backdrop-blur-lg dark:border-border dark:bg-background/80">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-1">
          <MobileMenu isSignedIn={!!session} />
          <LogoLink />
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {[
            { href: "/adopter", label: "Adopter" },
            { href: "/perdus-trouves", label: "Perdus / Trouvés" },
            { href: "/refuges", label: "Refuges" },
            { href: "/pensions", label: "Pensions" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {session ? (
          <div className="flex items-center gap-1">
            <MessagesNavLink />
            <NotificationBell />
            <UserNav user={session.user} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground sm:inline-flex"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-coral-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-coral-600"
            >
              S&apos;inscrire
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
