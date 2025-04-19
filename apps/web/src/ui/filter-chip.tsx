import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/* ------------------------------ FilterChip -------------------------------- */
export function FilterChip({ active, onClick, icon, children }: { active?: boolean; onClick?: () => void; icon?: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-3.5 text-[13px] font-semibold transition-colors",
        active ? "border-coral-600 bg-coral-600 text-sable-50" : "border-line bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}
