import { cn } from "./cn";
import { Icon } from "./Icon";

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
