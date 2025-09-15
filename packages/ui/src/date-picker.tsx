import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Icon } from "./Icon";

/* ------------------------------- helpers ISO ------------------------------ */
const pad = (n: number) => String(n).padStart(2, "0");
/** Date locale -> "YYYY-MM-DD" (même format que l'<input type="date"> natif). */
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s?: string | null): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const WEEKDAYS = ["lu", "ma", "me", "je", "ve", "sa", "di"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Sélecteur de date maison : déclencheur stylé + calendrier en portal
 * (dark-aware), à la place de l'<input type="date"> natif dont le calendrier
 * n'est pas stylable et varie selon l'OS / le navigateur.
 *
 * Trois usages, comme le {@link Select} maison :
 *  - contrôlé        (`value` + `onChange`)
 *  - formulaire      (`name` -> input caché lu par FormData, valeur ISO)
 *  - impératif       (`id` sur l'input caché)
 *
 * La valeur émise est toujours au format ISO `YYYY-MM-DD`, identique au natif :
 * les lecteurs existants (FormData, back-end) restent compatibles.
 */
export function DatePicker({
  value,
  defaultValue,
  onChange,
  name,
  id,
  placeholder = "Choisir une date…",
  className,
  disabled,
  dense,
  min,
  max,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Variante compacte (back-office dense). */
  dense?: boolean;
  /** Borne min/max au format `YYYY-MM-DD`. */
  min?: string;
  max?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const val = controlled ? value ?? "" : internal;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const [view, setView] = useState<Date>(() => fromISO(value ?? defaultValue) ?? new Date());
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const todayISO = toISO(new Date());
  const selected = fromISO(val);

  // Positionne le popover sous le déclencheur, dans un portal sur <body> pour
  // échapper aux conteneurs `overflow-hidden` (ex. Panel).
  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 280);
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    setPos({ left, top: r.bottom + 6, width });
  };

  useEffect(() => {
    if (!open) return;
    setView(fromISO(val) ?? new Date());
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (iso: string) => {
    if (!controlled) setInternal(iso);
    onChange?.(iso);
    setOpen(false);
  };

  // Grille de 6 semaines (42 cases), lundi en première colonne.
  const cells = useMemo(() => {
    const y = view.getFullYear();
    const m = view.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - offset + i));
  }, [view]);

  const monthLabel = cap(view.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  const shiftMonth = (delta: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  return (
    <div className={cn("relative w-full", className)}>
      <input type="hidden" id={id} name={name} value={val} readOnly />
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[4px] border bg-background text-left text-foreground outline-none transition-colors hover:border-sable-400 disabled:cursor-not-allowed disabled:opacity-60",
          dense ? "h-[42px] rounded-field px-3 text-[14px]" : "h-[46px] px-3.5 text-[14.5px]",
          open ? "border-coral-500 ring-2 ring-coral-500/15" : "border-line",
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground/70")}>
          {selected ? selected.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : placeholder}
        </span>
        <Icon name="calendar" size={dense ? 15 : 17} className="flex-none text-muted-foreground" />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Choisir une date"
            style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, animation: "dlMenu .14s ease-out" }}
            className="z-[80] rounded-card border border-line bg-card p-2.5 shadow-[0_16px_40px_rgba(20,16,8,.18)]"
          >
            {/* En-tête : mois + navigation */}
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mois précédent"
                className="grid h-8 w-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-muted hover:text-foreground">
                <Icon name="chevron" size={16} className="rotate-180" />
              </button>
              <span className="text-[14px] font-semibold text-foreground">{monthLabel}</span>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Mois suivant"
                className="grid h-8 w-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-muted hover:text-foreground">
                <Icon name="chevron" size={16} />
              </button>
            </div>

            {/* Jours de la semaine */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <span key={d} className="font-mono grid h-7 place-items-center text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{d}</span>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell) => {
                const iso = toISO(cell);
                const inMonth = cell.getMonth() === view.getMonth();
                const isSel = iso === val;
                const isToday = iso === todayISO;
                const isDisabled = (min != null && iso < min) || (max != null && iso > max);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => pick(iso)}
                    aria-current={isToday ? "date" : undefined}
                    aria-selected={isSel}
                    className={cn(
                      "grid h-9 place-items-center rounded-[7px] text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                      isSel
                        ? "bg-coral-600 font-semibold text-sable-50"
                        : cn(
                            inMonth ? "text-foreground" : "text-muted-foreground/45",
                            "hover:bg-muted",
                            isToday && "font-semibold text-coral-700 ring-1 ring-inset ring-coral-400 dark:text-coral-200",
                          ),
                    )}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Pied : aujourd'hui / effacer */}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <button type="button" onClick={() => pick(todayISO)}
                className="font-mono rounded-[6px] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-coral-700 hover:bg-tint-coral dark:text-coral-200">
                Aujourd'hui
              </button>
              {val && (
                <button type="button" onClick={() => pick("")}
                  className="font-mono rounded-[6px] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground hover:bg-muted">
                  Effacer
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
