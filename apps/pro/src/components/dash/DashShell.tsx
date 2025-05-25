import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";

export type DashNavItem = { to: string; label: string; icon: string; end?: boolean; count?: number };

/** Coquille console pro : sidebar (org + navigation + retour) + zone de contenu. */
export function DashShell({ org, label, icon, nav, children }: { org: string; label: string; icon: string; nav: DashNavItem[]; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-background">
      <aside className="dash-side sticky top-16 flex h-[calc(100vh-64px)] w-[264px] flex-none flex-col border-r border-line bg-card">
        <div className="border-b border-line p-4">
          <div className="font-mono mb-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Espace pro</div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] bg-prune-700 text-sable-50"><Icon name={icon} size={20} /></span>
            <div className="min-w-0">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-foreground">{org}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3.5">
          <div className="font-mono px-2 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Navigation</div>
          <div className="flex flex-col gap-0.5">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn("flex h-10 items-center justify-between gap-2 rounded-[9px] px-[11px] text-left transition-colors", isActive ? "bg-coral-50 text-coral-700" : "text-foreground hover:bg-muted")}>
                {({ isActive }) => (
                  <>
                    <span className={cn("inline-flex items-center gap-2.5 text-[14px]", isActive ? "font-semibold" : "font-medium")}>
                      <Icon name={n.icon} size={17} className={isActive ? "text-coral-600" : "text-muted-foreground"} /> {n.label}
                    </span>
                    {n.count ? <span className={cn("font-mono tabular grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10.5px] font-bold", isActive ? "bg-coral-600 text-sable-50" : "bg-brick-100 text-brick-600")}>{n.count}</span> : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="border-t border-line p-3">
          <button onClick={() => navigate("/")} className="flex h-10 w-full items-center gap-2.5 rounded-[9px] px-[11px] text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Icon name="logout" size={17} className="-scale-x-100" /> Retour au site
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-[34px] pb-[60px] pt-[30px]">{children}</div>
    </div>
  );
}
