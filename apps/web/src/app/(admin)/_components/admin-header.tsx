"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, PawPrint, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import { authClient } from "@infra/auth/auth-client";

interface AdminHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-50 border-b border-prune-200/60 bg-prune-50/80 backdrop-blur-lg dark:border-border dark:bg-background/80">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-foreground"
          >
            <PawPrint className="h-5 w-5 text-coral-500" />
            <span className="text-lg font-extrabold tracking-tight">
              dorloter
            </span>
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-prune-300 bg-prune-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-prune-700">
            <Shield className="h-3 w-3" />
            Administration
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-transparent px-1.5 py-1 text-sm font-medium text-foreground transition-colors hover:border-prune-200 hover:bg-white/60">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-prune-500 text-xs font-semibold text-white">
              {initial}
            </span>
            <span className="hidden text-sm sm:inline">{user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profil")}>
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/")}>
              Retour au site
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
