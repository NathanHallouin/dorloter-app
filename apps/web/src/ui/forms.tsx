import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const inputBase =
  "w-full h-[46px] rounded-[4px] border border-line bg-background text-foreground px-3.5 text-[14.5px] outline-none transition-colors focus:border-coral-500";

export function Field({ label, hint, children, full }: { label: string; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={cn("block", full && "[grid-column:1/-1]")}>
      <span className="font-mono mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-[5px] block text-[12px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "h-auto min-h-[104px] resize-y py-3 leading-normal", className)} />;
}

export function Select({ options, className, ...props }: { options: (string | { value: string; label: string })[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(inputBase, "cursor-pointer appearance-none pr-9", className)}
      style={{
        backgroundImage: "linear-gradient(45deg, transparent 50%, var(--muted-fg) 50%), linear-gradient(135deg, var(--muted-fg) 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 18px) center, calc(100% - 13px) center",
        backgroundSize: "5px 5px, 5px 5px",
        backgroundRepeat: "no-repeat",
        ...props.style,
      }}
    >
      {options.map((o) => {
        const value = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  );
}

export function PageHead({ crumb, title, sub, action }: { crumb: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="border-b border-line bg-card">
      <div className="mx-auto max-w-[1180px] px-8 py-[26px]">
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link to="/" className="text-muted-foreground">Accueil</Link>
          <Icon name="chevron" size={14} />
          <span className="font-semibold text-coral-700">{crumb}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-[720px]">
            <h1 className="text-[38px] font-semibold leading-[1.04] tracking-[-0.01em] text-foreground">{title}</h1>
            {sub && <p className="mt-1.5 text-[15.5px] text-muted-foreground">{sub}</p>}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = "paw", title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[6px] border border-dashed border-line bg-card px-6 py-16 text-center">
      <span className="inline-flex text-sable-400"><Icon name={icon} size={42} /></span>
      <h3 className="mt-3.5 text-[22px] font-semibold text-foreground">{title}</h3>
      {text && <p className="mx-auto mt-1.5 max-w-[380px] text-[14.5px] text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageBody({ children, width = 1180 }: { children: ReactNode; width?: number }) {
  return <div className="mx-auto px-8 py-[30px] pb-[60px]" style={{ maxWidth: width }}>{children}</div>;
}

type SegOption = { value: string; label: string; icon?: string };
export function Segmented({ options, value, onChange, full }: { options: SegOption[]; value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <div className={cn("inline-flex overflow-hidden rounded-[4px] border border-line", full && "w-full")}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 px-[18px] text-[14px] font-semibold",
              full && "flex-1",
              i > 0 && "border-l border-line",
              on ? "bg-coral-600 text-sable-50" : "bg-card text-muted-foreground",
            )}
          >
            {o.icon && <Icon name={o.icon} size={16} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
