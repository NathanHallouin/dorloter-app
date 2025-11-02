export type MenuItem = { to: string; icon: string; title: string; desc: string };
export type NavGroup = { id: string; label: string; to: string | null; match: string[]; menu: MenuItem[] };

export const PRIMARY: NavGroup[] = [
  { id: "adopt", label: "Adopter", to: "/adopter", match: ["/adopter", "/quiz", "/evenements"], menu: [
    { to: "/adopter", icon: "cat", title: "Catalogue des animaux", desc: "Tous les chats & chiens à adopter" },
    { to: "/adopter/swipe", icon: "paw", title: "Mode swipe", desc: "Un coup de cœur d'un geste" },
    { to: "/quiz", icon: "sparkles", title: "Quiz de compatibilité", desc: "Le bon profil en 7 questions" },
    { to: "/evenements", icon: "calendar", title: "Événements", desc: "Portes ouvertes & journées adoption" },
  ] },
  { id: "lost", label: "Perdus & trouvés", to: "/perdus-trouves", match: ["/perdus-trouves"], menu: [
    { to: "/perdus-trouves", icon: "map", title: "Carte des signalements", desc: "Les alertes autour de vous" },
    { to: "/perdus-trouves/nouveau", icon: "radio", title: "Signaler un animal", desc: "Publier une alerte en 3 étapes" },
  ] },
  { id: "annuaires", label: "Annuaires", to: null, match: ["/refuges", "/pensions", "/a-propos"], menu: [
    { to: "/refuges", icon: "shield", title: "Refuges", desc: "Associations & SPA partenaires" },
    { to: "/pensions", icon: "home", title: "Pensions", desc: "Garde vérifiée pour vos absences" },
  ] },
];

export const PRO_BY_ROLE: Record<string, { to: string; icon: string; label: string; desc: string }> = {
  shelter_admin: { to: "/refuge", icon: "shield", label: "Espace refuge", desc: "Gérer vos animaux" },
  pension_admin: { to: "/pension", icon: "home", label: "Espace pension", desc: "Vos réservations" },
  platform_admin: { to: "/admin", icon: "shieldCheck", label: "Administration", desc: "Modération & plateforme" },
};

// L'espace pro est une application séparée (apps/pro), servie sur un autre
// domaine. On y renvoie en navigation externe. En dev : localhost:5174.
export const PRO_URL =
  import.meta.env.VITE_PRO_URL ??
  (import.meta.env.DEV ? "http://localhost:5174" : "https://pro.dorloter.fr");

export const TILE: Record<string, string> = {
  coral: "bg-coral-50 text-coral-600 border-coral-300",
  prune: "bg-prune-50 text-prune-600 border-prune-300",
  lavande: "bg-lavande-50 text-lavande-600 border-lavande-300",
  brick: "bg-brick-50 text-brick-600 border-brick-300",
};

export const ghostBtn = "relative grid h-10 w-10 cursor-pointer place-items-center rounded-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
