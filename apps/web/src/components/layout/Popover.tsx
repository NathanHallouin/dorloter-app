import type { ReactNode } from "react";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { TILE } from "./nav-data";

export function Popover({ children, onClose, width = 300 }: { children: ReactNode; onClose: () => void; width?: number }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[55]" />
      <div className="glass-panel absolute right-0 top-full z-[56] mt-2.5 rounded-2xl border border-line p-2 shadow-[0_24px_56px_rgba(20,16,8,.22)] [animation:dlMenu_.16s_ease_both]" style={{ width }}>{children}</div>
    </>
  );
}

export function Row({ icon, label, sub, onClick, tone = "coral", right }: { icon: string; label: string; sub?: string; onClick: () => void; tone?: string; right?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-[11px] p-2.5 text-left transition-colors hover:bg-muted">
      <span className={cn("grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] border", TILE[tone] ?? TILE.coral)}><Icon name={icon} size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-foreground">{label}</span>
        {sub && <span className="mono mt-px block text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">{sub}</span>}
      </span>
      {right}
    </button>
  );
}

export const Divider = () => <div className="mx-2 my-1.5 h-px bg-line" />;
export const Label = ({ children }: { children: ReactNode }) => <div className="mono px-[11px] pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</div>;
