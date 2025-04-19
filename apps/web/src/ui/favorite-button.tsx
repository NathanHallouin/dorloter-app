import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

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
