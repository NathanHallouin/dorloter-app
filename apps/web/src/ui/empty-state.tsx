import type { ReactNode } from "react";
import { Icon } from "./Icon";

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
