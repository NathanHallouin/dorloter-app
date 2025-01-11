"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Flag,
  Home,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageCircle,
  PawPrint,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Stethoscope,
  Store,
  Users,
  X,
} from "lucide-react";
import { InstallButton } from "@/components/pwa/install-prompt";

const PUBLIC_LINKS = [
  { href: "/adopter", label: "Adopter" },
  { href: "/perdus-trouves", label: "Perdus / Trouvés" },
  { href: "/refuges", label: "Refuges" },
  { href: "/pensions", label: "Pensions" },
  { href: "/veterinaires", label: "Vétérinaires" },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/admin/moderation", label: "Modération", Icon: Flag },
  { href: "/admin/shelters", label: "Refuges à vérifier", Icon: ShieldCheck },
  { href: "/admin/pensions", label: "Pensions à vérifier", Icon: Store },
  { href: "/admin/users", label: "Utilisateurs", Icon: Users },
];

const SHELTER_LINKS = [
  { href: "/shelter", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/shelter-animaux", label: "Mes animaux", Icon: PawPrint },
  { href: "/shelter-candidatures", label: "Candidatures", Icon: Inbox },
  { href: "/shelter-messages", label: "Messages", Icon: MessageCircle },
  { href: "/shelter-stats", label: "Statistiques", Icon: BarChart3 },
  { href: "/shelter-profil", label: "Profil du refuge", Icon: Settings },
];

const VET_LINKS = [
  { href: "/vet", label: "Tableau de bord", Icon: LayoutDashboard },
  {
    href: "/vet-recherche-signalements",
    label: "Recherche signalements",
    Icon: Search,
  },
  { href: "/vet-equipe", label: "Équipe", Icon: Users },
  { href: "/vet-profil", label: "Profil du cabinet", Icon: Settings },
];

interface MobileMenuProps {
  isSignedIn: boolean;
  isPlatformAdmin?: boolean;
  isShelterAdmin?: boolean;
  isVetAdmin?: boolean;
}

export function MobileMenu({
  isSignedIn,
  isPlatformAdmin,
  isShelterAdmin,
  isVetAdmin,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fermer le menu en cas de navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquer le scroll body quand ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-sable-100 md:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-x-0 top-14 z-40 border-b border-sable-200/80 bg-white/95 backdrop-blur-lg md:hidden dark:border-border dark:bg-background/95"
          role="dialog"
          aria-label="Menu"
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                  pathname === l.href || pathname.startsWith(l.href + "/")
                    ? "bg-coral-50 text-coral-700"
                    : "text-foreground hover:bg-sable-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {isPlatformAdmin && (
              <>
                <div className="my-2 h-px bg-sable-200" />
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-prune-700">
                  <Shield className="h-3 w-3" />
                  Administration
                </div>
                {ADMIN_LINKS.map(({ href, label, Icon }) => {
                  const active =
                    href === "/admin"
                      ? pathname === "/admin"
                      : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                        active
                          ? "bg-coral-50 text-coral-700"
                          : "text-foreground hover:bg-sable-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
            {isShelterAdmin && (
              <>
                <div className="my-2 h-px bg-sable-200" />
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-lavande-700">
                  <Home className="h-3 w-3" />
                  Espace refuge
                </div>
                {SHELTER_LINKS.map(({ href, label, Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                        active
                          ? "bg-coral-50 text-coral-700"
                          : "text-foreground hover:bg-sable-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
            {isVetAdmin && (
              <>
                <div className="my-2 h-px bg-sable-200" />
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-teal-700">
                  <Stethoscope className="h-3 w-3" />
                  Espace vétérinaire
                </div>
                {VET_LINKS.map(({ href, label, Icon }) => {
                  const active =
                    href === "/vet"
                      ? pathname === "/vet"
                      : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                        active
                          ? "bg-teal-50 text-teal-700"
                          : "text-foreground hover:bg-sable-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
            {!isSignedIn && (
              <>
                <div className="my-2 h-px bg-sable-200" />
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-sable-100"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-coral-500 px-3 py-2.5 text-center text-base font-medium text-white hover:bg-coral-600"
                >
                  Créer un compte
                </Link>
              </>
            )}

            <InstallButton variant="default" className="mt-2" />
          </nav>
        </div>
      )}
    </>
  );
}
