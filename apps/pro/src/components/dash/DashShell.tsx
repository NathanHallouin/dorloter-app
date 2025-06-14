import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn, Icon } from "@dorloter/ui";
import { useAuth } from "@dorloter/client";

export type DashNavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  count?: number;
  /** Regroupe les entrées sous un intertitre dans la sidebar. */
  group?: string;
};

const ROLE_LABEL: Record<string, string> = {
  platform_admin: "Admin plateforme",
  pension_admin: "Gestion pension",
  shelter_admin: "Responsable refuge",
  user: "Membre d'équipe",
};

function initials(name?: string) {
  return (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Bascule clair / sombre, persistée dans localStorage (init no-FOUC dans index.html). */
function useDarkMode() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("dl-theme", next ? "dark" : "light");
    } catch {
      /* stockage indisponible : on ignore */
    }
    setDark(next);
  };
  return { dark, toggle };
}

/** Coquille console pro : barre supérieure + sidebar groupée + zone de contenu. */
export function DashShell({
  org,
  label,
  icon,
  nav,
  children,
}: {
  org: string;
  label: string;
  icon: string;
  nav: DashNavItem[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { dark, toggle } = useDarkMode();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  // Ferme le tiroir mobile à chaque changement de page.
  useEffect(() => setDrawer(false), [location.pathname]);

  const active = [...nav]
    .filter((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  const sidebar = (
    <SidebarBody org={org} label={label} icon={icon} nav={nav} />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ----------------------------- Topbar ----------------------------- */}
      <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line px-4 md:px-6">
        <button
          onClick={() => setDrawer(true)}
          className="grid size-10 place-items-center rounded-field text-foreground hover:bg-muted md:hidden"
          aria-label="Ouvrir la navigation"
        >
          <Icon name="menu" size={20} />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-foreground">Dorloter</span>
          <span className="font-mono hidden rounded-[4px] bg-prune-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-sable-50 sm:inline">
            Pro
          </span>
          {active && (
            <span className="hidden items-center gap-2 truncate text-muted-foreground md:inline-flex">
              <Icon name="chevron" size={14} className="rotate-[-90deg] opacity-50" />
              <span className="truncate text-[14px] font-medium text-foreground">{active.label}</span>
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={toggle}
            className="grid size-10 place-items-center rounded-field text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={dark ? "Passer en clair" : "Passer en sombre"}
            title={dark ? "Thème clair" : "Thème sombre"}
          >
            <Icon name={dark ? "sun" : "moon"} size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-2.5 hover:border-coral-300"
            >
              <Avatarish src={user?.image} name={user?.name} />
              <span className="hidden text-[13.5px] font-semibold text-foreground sm:inline">{user?.name ?? "Compte"}</span>
              <Icon name="chevron" size={14} className={cn("text-muted-foreground transition-transform", menu && "rotate-180")} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div
                  className="glass-panel absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-card border border-line shadow-[0_16px_40px_rgba(20,16,8,.18)]"
                  style={{ animation: "dlMenu .14s ease-out" }}
                >
                  <div className="border-b border-line px-4 py-3">
                    <div className="truncate text-[14px] font-semibold text-foreground">{user?.name}</div>
                    <div className="truncate text-[12px] text-muted-foreground">{user?.email}</div>
                    <div className="font-mono mt-1.5 inline-block rounded-[4px] bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {ROLE_LABEL[user?.role ?? "user"] ?? "Membre"}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13.5px] text-foreground hover:bg-muted"
                  >
                    <Icon name="external" size={16} className="text-muted-foreground" /> Retour au site
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-[13.5px] text-brick-600 hover:bg-brick-50"
                  >
                    <Icon name="logout" size={16} /> Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ----------------------------- Sidebar (desktop) --------------- */}
        <aside className="dash-side sticky top-16 hidden h-[calc(100vh-64px)] w-[260px] flex-none border-r border-line bg-card md:flex md:flex-col">
          {sidebar}
        </aside>

        {/* ----------------------------- Drawer (mobile) ----------------- */}
        {drawer && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-prune-900/40" onClick={() => setDrawer(false)} />
            <aside
              className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-line bg-card"
              style={{ animation: "dlMenu .16s ease-out" }}
            >
              {sidebar}
            </aside>
          </div>
        )}

        {/* ----------------------------- Content ------------------------- */}
        <main className="min-w-0 flex-1 px-5 pb-16 pt-7 md:px-[34px] md:pt-8">{children}</main>
      </div>
    </div>
  );
}

/* ------------------------------ Sidebar body ------------------------------ */
function SidebarBody({ org, label, icon, nav }: { org: string; label: string; icon: string; nav: DashNavItem[] }) {
  const navigate = useNavigate();
  let lastGroup: string | undefined;

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line p-4">
        <span className="grid size-[40px] flex-none place-items-center rounded-[10px] bg-prune-700 text-sable-50">
          <Icon name={icon} size={21} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-semibold leading-tight text-foreground">{org}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {nav.map((n) => {
          const header = n.group && n.group !== lastGroup ? n.group : null;
          lastGroup = n.group;
          return (
            <div key={n.to}>
              {header && (
                <div className="font-mono px-2 pb-1.5 pt-3.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground first:pt-1">
                  {header}
                </div>
              )}
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "group relative flex h-[38px] items-center justify-between gap-2 rounded-[9px] px-[11px] transition-colors",
                    isActive ? "bg-coral-50 text-coral-700" : "text-foreground hover:bg-muted",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-coral-600" />
                    )}
                    <span className={cn("inline-flex items-center gap-2.5 text-[13.5px]", isActive ? "font-semibold" : "font-medium")}>
                      <Icon name={n.icon} size={17} className={isActive ? "text-coral-600" : "text-muted-foreground"} />
                      {n.label}
                    </span>
                    {n.count ? (
                      <span
                        className={cn(
                          "font-mono tabular grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10.5px] font-bold",
                          isActive ? "bg-coral-600 text-sable-50" : "bg-brick-100 text-brick-600",
                        )}
                      >
                        {n.count}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <button
          onClick={() => navigate("/")}
          className="flex h-10 w-full items-center gap-2.5 rounded-[9px] px-[11px] text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon name="external" size={17} /> Retour au site public
        </button>
      </div>
    </>
  );
}

/* ------------------------------ Avatar (topbar) --------------------------- */
function Avatarish({ src, name }: { src?: string | null; name?: string }) {
  if (src) return <img src={src} alt="" className="size-8 rounded-full object-cover" />;
  return (
    <span className="font-mono grid size-8 place-items-center rounded-full bg-prune-100 text-[12px] font-semibold text-prune-700">
      {initials(name)}
    </span>
  );
}
