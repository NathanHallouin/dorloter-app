import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------ Stamp ------------------------------------- */
const STAMP_BG: Record<string, string> = { prune: "bg-prune-700", coral: "bg-coral-700", brick: "bg-brick-700" };
export function Stamp({ children, tone = "prune", rotate = -9, style }: { children: ReactNode; tone?: string; rotate?: number; style?: CSSProperties }) {
  return (
    <span
      className={cn("font-mono inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-lavande-400 px-[14px] py-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-lavande-200 shadow-[0_8px_22px_rgba(20,16,8,.3)]", STAMP_BG[tone] ?? STAMP_BG.prune)}
      style={{ transform: `rotate(${rotate}deg)`, animation: "dlStampIn .4s ease both", ...style }}
    >
      {children}
    </span>
  );
}
