import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";

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
