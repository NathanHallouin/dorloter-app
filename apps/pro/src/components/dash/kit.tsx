import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { Pill } from "@dorloter/ui";

/* ------------------------------ Form controls ----------------------------- *
 * Densité back-office, tokens dark-aware, focus ring cohérent. `field` pour
 * les <input>/<textarea>, `selectField` (flèche maison via .dl-select) pour
 * les <select>, `Field` pour le label, `Select` comme raccourci stylé.       */
export const field =
  "w-full rounded-field border border-line bg-background text-foreground px-3 py-2 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-sable-400 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/15 disabled:cursor-not-allowed disabled:opacity-60";
export const selectField = cn(field, "dl-select cursor-pointer");

export function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="font-mono mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

type SelectOption = string | { value: string; label: string };

/**
 * Select maison : bouton + popover entièrement stylé (dark-aware), à la place du
 * <select> natif dont la liste déroulante n'est pas stylable. Couvre les trois
 * usages : contrôlé (value/onChange), formulaire (name -> input caché lu par
 * FormData) et impératif (id sur l'input caché, lu via getElementById).
 */
export function Select({
  options,
  value,
  defaultValue,
  onChange,
  name,
  id,
  placeholder = "Choisir…",
  className,
  disabled,
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const val = controlled ? value : internal;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Position fixe calculée depuis le bouton : la liste vit dans un portal sur
  // <body> pour échapper aux conteneurs `overflow-hidden` (ex. Panel).
  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 6, width: r.width, maxHeight: Math.max(160, window.innerHeight - r.bottom - 16) });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const reposition = () => place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const pick = (v: string) => {
    if (!controlled) setInternal(v);
    onChange?.(v);
    setOpen(false);
  };

  const current = opts.find((o) => o.value === val);

  return (
    <div className={cn("relative w-full", className)}>
      <input type="hidden" id={id} name={name} value={val} readOnly />
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-field border bg-background px-3 py-2 text-left text-[14px] text-foreground outline-none transition-colors hover:border-sable-400 disabled:cursor-not-allowed disabled:opacity-60",
          open ? "border-coral-500 ring-2 ring-coral-500/15" : "border-line",
        )}
      >
        <span className={cn("truncate", !current && "text-muted-foreground/70")}>{current?.label ?? placeholder}</span>
        <Icon name="chevron" size={15} className={cn("flex-none text-muted-foreground transition-transform", open ? "-rotate-90" : "rotate-90")} />
      </button>
      {open && pos &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight, animation: "dlMenu .14s ease-out" }}
            className="z-[70] overflow-auto rounded-card border border-line bg-card p-1 shadow-[0_16px_40px_rgba(20,16,8,.18)]"
          >
            {opts.map((o) => {
              const active = o.value === val;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(o.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-[7px] px-2.5 py-1.5 text-left text-[14px] transition-colors",
                      active ? "bg-tint-coral font-semibold text-coral-700 dark:text-coral-200" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {active && <Icon name="check" size={14} className="flex-none text-coral-600" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}

const TILE: Record<string, string> = {
  coral: "bg-coral-50 dark:bg-tint-coral border-coral-300 text-coral-600",
  lavande: "bg-lavande-50 dark:bg-tint-lavande border-lavande-300 text-lavande-600",
  prune: "bg-prune-50 dark:bg-tint-prune border-prune-300 text-prune-600 dark:text-prune-200",
  brick: "bg-brick-50 border-brick-300 text-brick-600",
};

/* ------------------------------ Stat card --------------------------------- */
export function Stat({ icon, label, value, delta, tone = "coral", sub }: { icon: string; label: string; value: string; delta?: number; tone?: string; sub?: string }) {
  return (
    <div className="group rounded-card border border-line bg-card px-[18px] pb-4 pt-[18px] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-coral-300 hover:shadow-[0_8px_24px_rgba(20,16,8,.07)]">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-[38px] w-[38px] place-items-center rounded-[9px] border", TILE[tone] ?? TILE.coral)}><Icon name={icon} size={19} /></span>
        {delta != null && (
          <span className={cn("font-mono inline-flex items-center gap-[3px] text-[11px] font-semibold", delta >= 0 ? "text-coral-600" : "text-brick-500")}>
            <Icon name="trending" size={13} style={delta >= 0 ? undefined : { transform: "scaleY(-1)" }} /> {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <div className="tabular mt-3 font-display text-[34px] font-semibold leading-none text-foreground">{value}</div>
      <div className="font-mono mt-[7px] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[12.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ------------------------------ Panel ------------------------------------- */
export function Panel({ title, hint, action, children, pad = true }: { title?: string; hint?: string; action?: ReactNode; children: ReactNode; pad?: boolean }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-card">
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-[18px] py-3.5">
          <div>
            <h3 className="text-[17px] font-semibold text-foreground">{title}</h3>
            {hint && <p className="font-mono mt-[3px] text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? "p-[18px]" : ""}>{children}</div>
    </section>
  );
}

/* ------------------------------ Status tag -------------------------------- */
export const STATUS: Record<string, { label: string; tone: string }> = {
  envoyee: { label: "À traiter", tone: "brick" },
  en_cours: { label: "Entretien", tone: "lavande" },
  acceptee: { label: "Acceptée", tone: "green" },
  refusee: { label: "Refusée", tone: "sable" },
  annulee: { label: "Annulée", tone: "sable" },
  disponible: { label: "En ligne", tone: "green" },
  pre_adoptable: { label: "Pré-adoptable", tone: "lavande" },
  reserve: { label: "Réservé", tone: "lavande" },
  adopte: { label: "Adopté", tone: "sable" },
  retire: { label: "Retiré", tone: "sable" },
};
export function Tag({ s }: { s: string }) {
  const o = STATUS[s] ?? { label: s, tone: "sable" };
  return <Pill tone={o.tone}>{o.label}</Pill>;
}

/* ------------------------------ Bars chart -------------------------------- */
const BAR: Record<string, { strong: string; soft: string }> = {
  coral: { strong: "bg-coral-500", soft: "bg-coral-200" },
  lavande: { strong: "bg-lavande-500", soft: "bg-lavande-200" },
};
export function Bars({ data, tone = "coral" }: { data: { k: string; v: number }[]; tone?: string }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  const c = BAR[tone] ?? BAR.coral!;
  return (
    <div className="flex h-[120px] items-end gap-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-[92px] w-full items-end">
            <div className={cn("w-full min-h-[4px] rounded-t-[4px]", i === data.length - 1 ? c.strong : c.soft)} style={{ height: `${(d.v / max) * 100}%` }} />
          </div>
          <span className="font-mono text-[9.5px] uppercase text-muted-foreground">{d.k}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Avatar ------------------------------------ */
export function Avatar({ src, name, size = 34 }: { src?: string | null; name?: string; size?: number }) {
  if (src) return <img src={src} alt="" className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} />;
  const init = (name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <span className="font-mono grid shrink-0 place-items-center rounded-lg bg-prune-100 font-semibold text-prune-700" style={{ width: size, height: size, fontSize: size * 0.34 }}>{init}</span>;
}

/* ------------------------------ MiniBtn ----------------------------------- */
const MINI: Record<string, string> = {
  green: "bg-coral-600 text-sable-50 border-coral-600",
  brick: "bg-brick-500 text-sable-50 border-brick-500",
  sable: "bg-transparent text-muted-foreground border-line",
};
export function MiniBtn({ icon, label, tone = "sable", onClick, disabled }: { icon?: string; label?: string; tone?: "green" | "brick" | "sable"; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn("font-mono inline-flex h-[30px] cursor-pointer items-center gap-[5px] rounded-[7px] border text-[11px] font-semibold uppercase tracking-[0.04em] disabled:cursor-not-allowed disabled:opacity-50", icon && !label ? "px-2" : "px-[11px]", MINI[tone])}>
      {icon && <Icon name={icon} size={14} />}{label}
    </button>
  );
}

/* ------------------------------ Page head --------------------------------- */
export function DashPageHead({ title, desc, action }: { title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-foreground">{title}</h1>
        {desc && <p className="mt-1.5 max-w-[560px] text-[14.5px] leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Table ------------------------------------- */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={cn("font-mono whitespace-nowrap px-3.5 pb-[11px] text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground", i === head.length - 1 ? "text-right" : "text-left")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Td({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={cn("border-t border-line px-3.5 py-3 align-middle text-[14px] text-foreground", right ? "text-right" : "text-left", className)}>{children}</td>;
}
