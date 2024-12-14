"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint, MapPin, MessageCircle, User, Bell, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  authed?: boolean;
  /** Affiche un point rouge quand ce compteur client-side est > 0 */
  badgeKey?: "messages";
}

const ITEMS_AUTHED: NavItem[] = [
  {
    href: "/adopter",
    label: "Adopter",
    icon: PawPrint,
    match: (p) =>
      p === "/adopter" || p.startsWith("/adopter/") ||
      p === "/" /* tab par défaut */,
  },
  {
    href: "/perdus-trouves",
    label: "Signaler",
    icon: MapPin,
    match: (p) =>
      p === "/perdus-trouves" ||
      p.startsWith("/perdus-trouves/") ||
      p === "/signaler" ||
      p === "/mes-signalements",
  },
  {
    href: "/messages",
    label: "Messages",
    icon: MessageCircle,
    match: (p) => p === "/messages" || p.startsWith("/messages/"),
    badgeKey: "messages",
  },
  {
    href: "/notifications",
    label: "Alertes",
    icon: Bell,
    match: (p) => p === "/notifications",
  },
  {
    href: "/profil",
    label: "Profil",
    icon: User,
    match: (p) =>
      p === "/profil" ||
      p === "/dashboard" ||
      p === "/candidatures" ||
      p === "/favoris" ||
      p.startsWith("/shelter-"),
  },
];

const ITEMS_ANON: NavItem[] = [
  {
    href: "/adopter",
    label: "Adopter",
    icon: PawPrint,
    match: (p) => p === "/adopter" || p.startsWith("/adopter/") || p === "/",
  },
  {
    href: "/perdus-trouves",
    label: "Signaler",
    icon: MapPin,
    match: (p) => p === "/perdus-trouves" || p.startsWith("/perdus-trouves/"),
  },
  {
    href: "/refuges",
    label: "Refuges",
    icon: Heart,
    match: (p) => p === "/refuges" || p.startsWith("/refuges/"),
  },
  {
    href: "/login",
    label: "Connexion",
    icon: User,
    match: (p) => p === "/login" || p === "/register",
  },
];

interface BottomNavProps {
  isSignedIn: boolean;
}

export function BottomNav({ isSignedIn }: BottomNavProps) {
  const pathname = usePathname();
  const items = isSignedIn ? ITEMS_AUTHED : ITEMS_ANON;
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread messages count toutes les 60s pour le badge
  useEffect(() => {
    if (!isSignedIn) return;
    async function fetchCount() {
      try {
        const res = await fetch("/api/messages/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { total: number };
        setUnreadMessages(data.total);
      } catch {
        /* ignore */
      }
    }
    fetchCount();
    const iv = window.setInterval(fetchCount, 60_000);
    return () => window.clearInterval(iv);
  }, [isSignedIn]);

  // Masquer sur les pages d'auth (layout split-screen) et sur les panels
  // admin / refuge (séparation visuelle avec le reste du site).
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/shelter-")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sable-200/80 bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] md:hidden dark:border-border dark:bg-background/95"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          const badge =
            item.badgeKey === "messages" && unreadMessages > 0
              ? unreadMessages
              : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-coral-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 ${active ? "stroke-[2.25]" : ""}`}
                  />
                  {badge > 0 && (
                    <span className="absolute -right-1.5 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
