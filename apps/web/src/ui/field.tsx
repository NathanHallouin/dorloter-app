import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({ label, hint, children, full }: { label: string; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={cn("block", full && "[grid-column:1/-1]")}>
      <span className="font-mono mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-[5px] block text-[12px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
