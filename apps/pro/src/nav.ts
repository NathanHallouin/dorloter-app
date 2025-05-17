/**
 * Sections de la console pro. Role-gating affiné en Phase 4 (refuge / pension
 * / veto / admin plateforme). Pour l'instant : structure de navigation.
 */
export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export const CONSOLE_NAV: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: "home" },
  { to: "/annonces", label: "Annonces", icon: "paw" },
  { to: "/candidatures", label: "Candidatures", icon: "mail" },
  { to: "/adoptions", label: "Adoptions", icon: "heart" },
  { to: "/familles", label: "Familles d'accueil", icon: "user" },
  { to: "/messages", label: "Messages", icon: "message" },
  { to: "/equipe", label: "Équipe", icon: "shieldCheck" },
  { to: "/profil", label: "Profil", icon: "sliders" },
];
