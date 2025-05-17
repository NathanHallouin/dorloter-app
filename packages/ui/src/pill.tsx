import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";

/* ------------------------------ Pill -------------------------------------- */
const PILL: Record<string, string> = {
  coral: "bg-coral-50 text-coral-700 border-coral-300",
  green: "bg-coral-50 text-coral-700 border-coral-300",
  lavande: "bg-lavande-50 text-lavande-700 border-lavande-300",
  prune: "bg-prune-50 text-prune-700 border-prune-300",
  brick: "bg-brick-50 text-brick-700 border-brick-300",
  rose: "bg-brick-50 text-brick-700 border-brick-300",
  sable: "bg-transparent text-muted-foreground border-line",
  white: "bg-[rgba(251,248,241,.94)] text-prune-800 border-[rgba(35,32,26,.08)]",
};
export function Pill({ children, tone = "sable", icon, className, style }: { children: ReactNode; tone?: string; icon?: string; className?: string; style?: CSSProperties }) {
  return (
    <span style={style} className={cn("font-mono inline-flex items-center gap-[5px] whitespace-nowrap rounded-[3px] border px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.04em]", PILL[tone] ?? PILL.sable, className)}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}
