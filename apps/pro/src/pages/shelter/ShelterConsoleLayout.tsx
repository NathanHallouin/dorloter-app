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
    { to: "/refuge", label: "Tableau de bord", icon: "gauge", end: true, group: "Pilotage" },
    { to: "/refuge/animaux", label: "Mes annonces", icon: "heart", group: "Animaux & adoption" },
    { to: "/refuge/sante", label: "Santé", icon: "syringe", group: "Animaux & adoption" },
    { to: "/refuge/candidatures", label: "Candidatures", icon: "inbox", count: pending, group: "Animaux & adoption" },
    { to: "/refuge/adoptions", label: "Adoptions", icon: "badgeCheck", group: "Animaux & adoption" },
    { to: "/refuge/contrats", label: "Contrats", icon: "shieldCheck", group: "Animaux & adoption" },
    { to: "/refuge/familles", label: "Familles d'accueil", icon: "home", group: "Animaux & adoption" },
    { to: "/refuge/benevoles", label: "Bénévoles", icon: "star", group: "Vie associative" },
    { to: "/refuge/evenements", label: "Événements", icon: "map", group: "Vie associative" },
    { to: "/refuge/stock", label: "Stock & besoins", icon: "sliders", group: "Vie associative" },
    { to: "/refuge/communication", label: "Communication", icon: "send", group: "Vie associative" },
    { to: "/refuge/registre", label: "Registre & stats", icon: "compass", group: "Suivi" },
    { to: "/refuge/messages", label: "Messagerie", icon: "message", group: "Suivi" },
    { to: "/refuge/equipe", label: "Équipe", icon: "users", group: "Réglages" },
    { to: "/refuge/profil", label: "Profil du refuge", icon: "settings", group: "Réglages" },
  ];

  return (
    <DashShell org={user?.name ?? "Mon refuge"} label="Espace refuge" icon="shield" nav={nav}>
      <Outlet />
    </DashShell>
  );
}
