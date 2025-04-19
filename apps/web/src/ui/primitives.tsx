import type { CSSProperties, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/* ------------------------------ Logo -------------------------------------- */
export function Logo({ size = "md", light }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const is = size === "lg" ? 26 : size === "sm" ? 17 : 20;
  const fs = size === "lg" ? "text-[27px]" : size === "sm" ? "text-[17px]" : "text-[20px]";
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span className={cn("inline-flex", light ? "text-white" : "text-coral-500")}>
        <Icon name="paw" size={is} stroke={2.2} />
      </span>
      <span className={cn("brandword font-bold tracking-[-0.02em]", fs, light ? "text-white" : "text-foreground")}>dorloter</span>
    </span>
  );
}

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

/* ------------------------------ Btn --------------------------------------- */
const btnVariants = cva(
  "inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap rounded-[6px] border font-semibold cursor-pointer transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:translate-y-0",
  {
    variants: {
      variant: {
        primary: "bg-coral-600 text-sable-50 border-coral-700 shadow-[0_1px_0_var(--coral-800)]",
        soft: "bg-coral-50 text-coral-700 border-coral-300",
        outline: "bg-transparent text-foreground border-foreground",
        ghost: "bg-transparent text-muted-foreground border-transparent",
        white: "bg-sable-50 text-coral-700 border-sable-50 shadow-[0_6px_18px_rgba(20,16,8,.18)]",
      },
      size: { sm: "h-9 px-3.5 text-[13.5px]", md: "h-11 px-[18px] text-[14.5px]", lg: "h-[52px] px-[26px] text-[15.5px]" },
      full: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Btn({
  children, variant, size, icon, iconRight, onClick, full, type = "button", disabled, className, style,
}: {
  children?: ReactNode; icon?: string; iconRight?: string; onClick?: () => void;
  type?: "button" | "submit"; disabled?: boolean; className?: string; style?: CSSProperties;
} & VariantProps<typeof btnVariants>) {
  const is = size === "lg" ? 18 : 16;
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={style} className={cn(btnVariants({ variant, size, full }), className)}>
      {icon && <Icon name={icon} size={is} />}
      {children}
      {iconRight && <Icon name={iconRight} size={is} />}
    </button>
  );
}

/* ------------------------------ CompatPills ------------------------------- */
export function CompatPills({ cats, dogs, children, hideNeg }: { cats?: string | null; dogs?: string | null; children?: string | null; hideNeg?: boolean }) {
  const items = [
    { value: cats, label: "chats", icon: "cat" },
    { value: dogs, label: "chiens", icon: "dog" },
    { value: children, label: "enfants", icon: "baby" },
  ].filter((it) => it.value && (!hideNeg || it.value === "oui"));
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => {
        const tone = it.value === "oui" ? "green" : it.value === "non" ? "rose" : "sable";
        const txt = it.value === "oui" ? `OK ${it.label}` : it.value === "non" ? `Sans ${it.label}` : `${it.label} ?`;
        return <Pill key={i} tone={tone} icon={it.icon}>{txt}</Pill>;
      })}
    </div>
  );
}

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

/* ------------------------------ FavoriteButton ---------------------------- */
export function FavoriteButton({ active, onToggle, size = 38 }: { active: boolean; onToggle: () => void; size?: number }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      aria-label="Favori"
      className={cn("grid shrink-0 cursor-pointer place-items-center rounded-[4px] border border-line bg-sable-50 transition-transform hover:scale-110", active ? "text-brick-500" : "text-sable-500")}
      style={{ width: size, height: size }}
    >
      <Icon name="heart" size={size * 0.5} fill={active ? "var(--brick-500)" : "none"} stroke={2.2} />
    </button>
  );
}
