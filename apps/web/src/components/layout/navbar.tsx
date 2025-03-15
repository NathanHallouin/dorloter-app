import Link from "next/link";
import { Home, Shield, Stethoscope } from "lucide-react";
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
          <MobileMenu
            isSignedIn={!!session}
            isPlatformAdmin={session?.user.role === "platform_admin"}
            isShelterAdmin={session?.user.role === "shelter_admin"}
            isVetAdmin={session?.user.role === "veterinarian_admin"}
          />
          <LogoLink />
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {[
            { href: "/adopter", label: "Adopter" },
            { href: "/perdus-trouves", label: "Perdus / Trouvés" },
            { href: "/refuges", label: "Refuges" },
            { href: "/pensions", label: "Pensions" },
            { href: "/veterinaires", label: "Vétérinaires" },
            { href: "/carte", label: "Carte" },
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
            {session.user.role === "platform_admin" && (
              <Link
                href="/admin"
                title="Administration"
                aria-label="Administration"
                className="hidden h-9 items-center gap-1.5 rounded-full border border-prune-200 bg-prune-50 px-3 text-xs font-semibold text-prune-700 transition-colors hover:border-prune-300 hover:bg-prune-100 sm:inline-flex"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
            {session.user.role === "shelter_admin" && (
              <Link
                href="/shelter"
                title="Espace refuge"
                aria-label="Espace refuge"
                className="hidden h-9 items-center gap-1.5 rounded-full border border-lavande-200 bg-lavande-50 px-3 text-xs font-semibold text-lavande-700 transition-colors hover:border-lavande-300 hover:bg-lavande-100 sm:inline-flex"
              >
                <Home className="h-3.5 w-3.5" />
                Refuge
              </Link>
            )}
            {session.user.role === "veterinarian_admin" && (
              <Link
                href="/vet"
                title="Espace vétérinaire"
                aria-label="Espace vétérinaire"
                className="hidden h-9 items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100 sm:inline-flex"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Cabinet
              </Link>
            )}
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
