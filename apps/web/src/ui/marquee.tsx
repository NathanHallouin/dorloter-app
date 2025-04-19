import { cn } from "@/lib/cn";

/* ------------------------------ Marquee ----------------------------------- */
const MARQUEE_BG: Record<string, string> = { prune: "bg-prune-700", coral: "bg-coral-500", lavande: "bg-lavande-500" };
export function Marquee({ items, tone = "prune" }: { items: string[]; tone?: string }) {
  const seq = items.join(" ✦ ") + " ✦ ";
  return (
    <div className={cn("overflow-hidden text-white border-y-2 border-white/20", MARQUEE_BG[tone] ?? MARQUEE_BG.prune)}>
      <div className="inline-flex whitespace-nowrap" style={{ animation: "dlMarquee 30s linear infinite" }}>
        {[0, 1].map((k) => (
          <span key={k} className="font-mono py-[11px] text-[13.5px] font-semibold uppercase tracking-[0.06em]">{seq}</span>
        ))}
      </div>
    </div>
  );
}
