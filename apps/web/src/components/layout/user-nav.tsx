"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import { authClient } from "@infra/auth/auth-client";
import { InstallButton } from "@/components/pwa/install-prompt";

interface UserNavProps {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
        {user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
          Tableau de bord
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/favoris")}>
          Mes coups de cœur
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/candidatures")}>
          Mes candidatures
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/mes-signalements")}>
          Mes signalements
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/profil")}>
          Mon profil
        </DropdownMenuItem>
        {user.role === "shelter_admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/shelter")}>
              Espace refuge
            </DropdownMenuItem>
          </>
        )}
        {user.role === "platform_admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              Administration
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <div className="px-1 py-0.5">
          <InstallButton variant="compact" className="w-full justify-start" />
        </div>
        <DropdownMenuItem onClick={handleSignOut}>
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
