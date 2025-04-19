import { cn } from "@/lib/cn";
import { Icon } from "@/ui/Icon";
import type { NavGroup } from "./nav-data";

export function NavGroupLink({ g, active, path, open, setOpenMenu, go }: { g: NavGroup; active: boolean; path: string; open: boolean; setOpenMenu: (v: string | null | ((c: string | null) => string | null)) => void; go: (to: string) => void }) {
  return (
    <div className="relative" onMouseEnter={() => setOpenMenu(g.id)} onMouseLeave={() => setOpenMenu((c) => (c === g.id ? null : c))}>
      <button
        onClick={() => { if (g.to) go(g.to); else setOpenMenu((o) => (o === g.id ? null : g.id)); }}
        aria-expanded={open}
        className={cn(
          "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-[11px] py-[9px] pl-3.5 pr-[11px] text-[14.5px] tracking-[-0.005em] transition-colors",
          active ? "bg-coral-600 font-semibold text-sable-50 shadow-[0_4px_12px_rgba(24,90,64,.34)]" : open ? "bg-muted font-medium text-foreground" : "font-medium text-muted-foreground hover:text-foreground",
        )}
      >
        {g.label}
        <Icon name="chevron" size={14} className="opacity-70 transition-transform" style={{ transform: open ? "rotate(-90deg)" : "rotate(90deg)" }} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
          <div className="glass-panel w-[320px] rounded-2xl border border-line p-2 shadow-[0_20px_48px_rgba(20,16,8,.20),0_4px_10px_rgba(20,16,8,.08)] [animation:dlMenu_.18s_cubic-bezier(.2,.7,.3,1)_both]">
            {g.menu.map((m) => {
              const mon = path === m.to;
              return (
                <button key={m.to} onClick={() => { go(m.to); setOpenMenu(null); }} className={cn("flex w-full items-center gap-3 rounded-[11px] p-3 text-left transition-colors", mon ? "bg-coral-50" : "hover:bg-muted")}>
                  <span className={cn("grid h-[38px] w-[38px] flex-none place-items-center rounded-[10px] border", mon ? "border-coral-600 bg-coral-600 text-sable-50" : "border-coral-300 bg-coral-50 text-coral-600")}><Icon name={m.icon} size={19} /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-foreground">{m.title}</span>
                    <span className="mt-px block text-[12px] leading-[1.35] text-muted-foreground">{m.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
