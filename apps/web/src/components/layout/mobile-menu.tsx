"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { InstallButton } from "@/components/pwa/install-prompt";

const PUBLIC_LINKS = [
  { href: "/adopter", label: "Adopter" },
  { href: "/perdus-trouves", label: "Perdus / Trouvés" },
  { href: "/refuges", label: "Refuges" },
  { href: "/pensions", label: "Pensions" },
];

interface MobileMenuProps {
  isSignedIn: boolean;
}

export function MobileMenu({ isSignedIn }: MobileMenuProps) {
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
