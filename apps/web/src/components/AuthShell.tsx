import type { ReactNode } from "react";
import { Logo } from "@dorloter/ui";

const PANEL_IMG = "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800&q=80&auto=format&fit=crop";

/** Coquille éditoriale en split-panel (citation à gauche, formulaire à droite). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1000px] px-8 pb-[60px] pt-10">
      <div className="grid min-h-[540px] grid-cols-2 overflow-hidden rounded-[6px] border border-foreground max-md:grid-cols-1">
        <div className="relative bg-prune-900 max-md:hidden">
          <img src={PANEL_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
          <div className="relative flex h-full flex-col justify-between p-[34px]">
            <Logo light size="lg" />
            <div>
              <p className="serif-i text-[27px] font-medium leading-[1.3] text-sable-50">
                « Sauver un animal ne changera pas le monde, mais pour cet animal, le monde changera. »
              </p>
              <p className="mono mt-4 text-[11px] uppercase tracking-[0.12em] text-lavande-300">La Gazette des animaux · Édito</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center bg-card p-10">{children}</div>
      </div>
    </div>
  );
}
