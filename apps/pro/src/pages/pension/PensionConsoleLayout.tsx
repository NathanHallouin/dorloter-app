import { Outlet } from "react-router-dom";
import { useAuth } from "@dorloter/client";
import { DashShell, type DashNavItem } from "@/components/dash/DashShell";

export function PensionConsoleLayout() {
  const { user } = useAuth();
  const nav: DashNavItem[] = [
    { to: "/pension", label: "Réservations", icon: "inbox", end: true },
  ];
  return (
    <DashShell
      org={user?.name ?? "Ma pension"}
      label="Espace pension"
      icon="home"
      nav={nav}
    >
      <Outlet />
    </DashShell>
  );
}
