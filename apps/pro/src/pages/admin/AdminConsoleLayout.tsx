import { Outlet } from "react-router-dom";
import { DashShell, type DashNavItem } from "@/components/dash/DashShell";

export function AdminConsoleLayout() {
  const nav: DashNavItem[] = [
    { to: "/admin", label: "Modération", icon: "shieldCheck", end: true },
  ];
  return (
    <DashShell org="Dorloter" label="Admin plateforme" icon="shield" nav={nav}>
      <Outlet />
    </DashShell>
  );
}
