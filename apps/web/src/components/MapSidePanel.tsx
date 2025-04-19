import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/Icon";

/** Panneau latéral rétractable superposé à la carte (style handoff). */
export function MapSidePanel({ side, open, onToggle, icon, label, children }: {
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  icon: string;
  label: string;
  children: ReactNode;
}) {
  const isLeft = side === "left";
  return (
    <>
      <aside
        className={cn(
          "absolute bottom-0 top-0 z-10 flex w-[344px] flex-col bg-card transition-transform duration-300 max-md:w-[300px]",
          isLeft ? "left-0 border-r border-line shadow-[8px_0_28px_rgba(20,16,8,.12)]" : "right-0 border-l border-line shadow-[-8px_0_28px_rgba(20,16,8,.12)]",
        )}
        style={{ transform: open ? "translateX(0)" : `translateX(${isLeft ? "-110%" : "110%"})` }}
      >
        <header className="flex flex-none items-center justify-between gap-2 border-b border-line bg-muted px-3.5 py-[11px]">
          <span className="mono inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Icon name={icon} size={15} /> {label}
          </span>
          <button onClick={onToggle} aria-label={`Replier ${label}`} className="grid h-[26px] w-[26px] place-items-center rounded-[5px] text-muted-foreground hover:bg-muted">
            <Icon name="chevron" size={16} className={isLeft ? "rotate-180" : ""} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </aside>

      {!open && (
        <button onClick={onToggle}
          className={cn("absolute bottom-4 z-[11] inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-3.5 text-[13px] font-semibold text-foreground shadow-[0_6px_18px_rgba(20,16,8,.14)]", isLeft ? "left-3.5" : "right-3.5")}>
          {!isLeft && <Icon name="chevron" size={14} className="rotate-180" />}
          <Icon name={icon} size={15} /> {label}
          {isLeft && <Icon name="chevron" size={14} />}
        </button>
      )}
    </>
  );
}
