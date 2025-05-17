import type { ReactNode } from "react";
import { cn } from "./cn";

/* ------------------------------ Eyebrow ----------------------------------- */
const EYEBROW: Record<string, { text: string; bar: string }> = {
  coral: { text: "text-coral-600", bar: "bg-coral-500" },
  lavande: { text: "text-lavande-600", bar: "bg-lavande-500" },
  prune: { text: "text-prune-600", bar: "bg-prune-500" },
  brick: { text: "text-brick-600", bar: "bg-brick-500" },
};
export function Eyebrow({ children, tone = "coral" }: { children: ReactNode; tone?: string }) {
  const t = EYEBROW[tone] ?? EYEBROW.coral!;
  return (
    <p className={cn("font-mono inline-flex items-center gap-[9px] text-[11.5px] font-semibold uppercase tracking-[0.18em]", t.text)}>
      <span className={cn("h-[1.5px] w-[18px]", t.bar)} />
      {children}
    </p>
  );
}
