import { Link, useLocation } from "react-router-dom";
import { Icon } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";
import { useCompare, removeCompare, clearCompare, COMPARE_MAX } from "@/lib/compare";

/**
 * Barre flottante de comparaison. Apparaît dès qu'un animal est sélectionné,
 * masquée sur la page de comparaison elle-même. Montée globalement dans le Layout.
 */
export function CompareBar() {
  const items = useCompare();
  const onComparePage = useLocation().pathname === "/adopter/compare";
  if (items.length === 0 || onComparePage) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div className="pointer-events-auto flex w-full max-w-[720px] items-center gap-3 rounded-[10px] border border-line bg-card/95 px-4 py-3 shadow-[0_16px_40px_rgba(20,16,8,.20)] backdrop-blur max-sm:flex-col max-sm:items-stretch">
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span className="mono hidden flex-none text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:inline">
            Comparer
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {items.map((it) => (
              <div key={it.id} className="group relative h-11 w-11 flex-none overflow-hidden rounded-[6px] border border-line bg-muted">
                {it.photo ? (
                  <img src={it.photo} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[20px] text-sable-300">{it.species === "chat" ? "🐱" : "🐶"}</span>
                )}
                <button
                  type="button"
                  title={`Retirer ${it.name}`}
                  onClick={() => removeCompare(it.id)}
                  className="absolute inset-0 grid place-items-center bg-foreground/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
            {Array.from({ length: COMPARE_MAX - items.length }).map((_, i) => (
              <div key={`slot-${i}`} className="h-11 w-11 flex-none rounded-[6px] border border-dashed border-line" />
            ))}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={clearCompare}
            className="text-[12.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Vider
          </button>
          {items.length < 2 ? (
            <Btn icon="columns" disabled>Comparer ({items.length})</Btn>
          ) : (
            <Link to="/adopter/compare">
              <Btn icon="columns">Comparer ({items.length})</Btn>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
