import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shelterApi } from "@dorloter/client";
import { useAuth } from "@dorloter/client";
import { DashShell, type DashNavItem } from "@/components/dash/DashShell";

export function ShelterConsoleLayout() {
  const { user } = useAuth();
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const pending = (apps.data ?? []).filter((a) => a.status === "envoyee" || a.status === "en_cours").length;

  const nav: DashNavItem[] = [
    { to: "/refuge", label: "Tableau de bord", icon: "gauge", end: true },
    { to: "/refuge/animaux", label: "Mes annonces", icon: "heart" },
    { to: "/refuge/sante", label: "Santé", icon: "syringe" },
    { to: "/refuge/candidatures", label: "Candidatures", icon: "inbox", count: pending },
    { to: "/refuge/adoptions", label: "Adoptions", icon: "badgeCheck" },
    { to: "/refuge/contrats", label: "Contrats", icon: "shieldCheck" },
    { to: "/refuge/familles", label: "Familles d'accueil", icon: "home" },
    { to: "/refuge/benevoles", label: "Bénévoles", icon: "star" },
    { to: "/refuge/evenements", label: "Événements", icon: "map" },
    { to: "/refuge/registre", label: "Registre & stats", icon: "compass" },
    { to: "/refuge/messages", label: "Messagerie", icon: "message" },
    { to: "/refuge/equipe", label: "Équipe", icon: "users" },
    { to: "/refuge/profil", label: "Profil du refuge", icon: "settings" },
  ];

  return (
    <DashShell org={user?.name ?? "Mon refuge"} label="Espace refuge" icon="shield" nav={nav}>
      <Outlet />
    </DashShell>
  );
}
