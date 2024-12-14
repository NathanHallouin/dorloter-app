"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  PawPrint,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface ShelterSidebarProps {
  counts: {
    applicationsPending: number;
    unreadMessages: number;
  };
}

export function ShelterSidebar({ counts }: ShelterSidebarProps) {
  const pathname = usePathname();

  const links: NavLink[] = [
    { href: "/shelter", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/shelter-animaux", label: "Mes animaux", icon: PawPrint },
    {
      href: "/shelter-candidatures",
      label: "Candidatures",
      icon: Inbox,
      count: counts.applicationsPending,
    },
    {
      href: "/shelter-messages",
      label: "Messages",
      icon: MessageCircle,
      count: counts.unreadMessages,
    },
    { href: "/shelter-stats", label: "Statistiques", icon: BarChart3 },
    { href: "/shelter-profil", label: "Profil du refuge", icon: Settings },
  ];

  const activeLink = links.find((l) => isActive(pathname, l.href));

  return (
    <>
      <aside className="hidden w-60 shrink-0 md:block">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Espace refuge
        </p>
        <nav className="flex flex-col gap-0.5 text-sm">
          {links.map((link) => (
            <DesktopLink
              key={link.href}
              link={link}
              active={isActive(pathname, link.href)}
            />
          ))}
        </nav>
        <div className="mt-6 border-t border-lavande-200/80 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
        </div>
      </aside>

      <MobileNav links={links} activeLink={activeLink} pathname={pathname} />
    </>
  );
}

function DesktopLink({
  link,
  active,
}: {
  link: NavLink;
  active: boolean;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`group inline-flex items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors ${
        active
          ? "bg-coral-50 text-coral-700"
          : "text-foreground hover:bg-sable-100"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${active ? "text-coral-600" : "text-muted-foreground"}`}
        />
        {link.label}
      </span>
      {link.count !== undefined && link.count > 0 && (
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
            active
              ? "bg-coral-600 text-white"
              : "bg-coral-100 text-coral-700"
          }`}
        >
          {link.count > 99 ? "99+" : link.count}
        </span>
      )}
    </Link>
  );
}

function MobileNav({
  links,
  activeLink,
  pathname,
}: {
  links: NavLink[];
  activeLink: NavLink | undefined;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ActiveIcon = activeLink?.icon ?? PawPrint;
  const totalPending = links.reduce((n, l) => n + (l.count ?? 0), 0);

  return (
    <div className="mb-5 md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left shadow-xs"
      >
        <span className="inline-flex items-center gap-2.5">
          <ActiveIcon className="h-4 w-4 text-coral-600" />
          <span className="text-sm font-medium text-foreground">
            {activeLink?.label ?? "Espace refuge"}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          {totalPending > 0 && !open && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral-500 px-1.5 text-[10px] font-bold tabular-nums text-white">
              {totalPending > 99 ? "99+" : totalPending}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <nav className="flex flex-col py-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-coral-50 text-coral-700"
                      : "text-foreground hover:bg-sable-50"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${
                        active ? "text-coral-600" : "text-muted-foreground"
                      }`}
                    />
                    {link.label}
                  </span>
                  {link.count !== undefined && link.count > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                        active
                          ? "bg-coral-600 text-white"
                          : "bg-coral-100 text-coral-700"
                      }`}
                    >
                      {link.count > 99 ? "99+" : link.count}
                    </span>
                  )}
                </Link>
              );
            })}
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-sable-50 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au site
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
