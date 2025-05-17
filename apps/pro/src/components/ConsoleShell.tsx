import { NavLink, Outlet } from "react-router-dom";
import { Icon, cn } from "@dorloter/ui";
import { useAuth } from "@dorloter/client";
import { CONSOLE_NAV } from "@/nav";

/**
 * Shell de la console pro : sidebar verticale dense + zone de contenu.
 * Volontairement distinct de la vitrine publique (orienté gestion/donnees).
 */
export function ConsoleShell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="dash-side flex w-64 shrink-0 flex-col border-r border-line bg-card">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid size-8 place-items-center rounded-field bg-primary text-primary-foreground">
            <Icon name="paw" size={18} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">Dorloter</div>
            <div className="mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Espace pro
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          {CONSOLE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "mb-0.5 flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-3 py-3">
          <div className="truncate px-3 pb-2 text-sm">
            {user?.name ?? user?.email}
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon name="arrow" size={18} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
