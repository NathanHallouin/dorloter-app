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
    { to: "/refuge/stats", label: "Statistiques", icon: "trending", group: "Pilotage" },

    // « Animaux » est désormais un hub : fiche, santé et registre vivent dans la page de chaque animal.
    { to: "/refuge/animaux", label: "Animaux", icon: "heart", group: "Animaux & adoption" },
    { to: "/refuge/candidatures", label: "Candidatures", icon: "inbox", count: pending, group: "Animaux & adoption" },
    { to: "/refuge/contrats", label: "Contrats", icon: "shieldCheck", group: "Animaux & adoption" },
    { to: "/refuge/suivi", label: "Suivi post-adoption", icon: "bell", group: "Animaux & adoption" },
    { to: "/refuge/familles", label: "Familles d'accueil", icon: "home", group: "Animaux & adoption" },

    { to: "/refuge/benevoles", label: "Bénévoles", icon: "star", group: "Vie associative" },
    { to: "/refuge/evenements", label: "Agenda", icon: "calendar", group: "Vie associative" },
    { to: "/refuge/stock", label: "Stock & besoins", icon: "sliders", group: "Vie associative" },

    { to: "/refuge/messages", label: "Messagerie", icon: "message", group: "Communication" },
    { to: "/refuge/communication", label: "Campagnes", icon: "send", group: "Communication" },
    { to: "/refuge/modeles", label: "Modèles de réponses", icon: "edit", group: "Communication" },

    { to: "/refuge/equipe", label: "Équipe", icon: "users", group: "Réglages" },
    { to: "/refuge/profil", label: "Profil du refuge", icon: "settings", group: "Réglages" },
  ];

  return (
    <DashShell org={user?.name ?? "Mon refuge"} label="Espace refuge" icon="shield" nav={nav}>
      <Outlet />
    </DashShell>
  );
}
