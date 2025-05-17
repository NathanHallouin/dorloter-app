import type { CSSProperties } from "react";
import { cn } from "./cn";

/* ------------------------------ Rule -------------------------------------- */
export function Rule({ label, className, style }: { label?: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("flex items-center gap-[14px]", className)} style={style}>
      <span className="h-px flex-1 bg-line" />
      {label && <span className="font-mono whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>}
      {label && <span className="h-px flex-1 bg-line" />}
    </div>
  );
}
