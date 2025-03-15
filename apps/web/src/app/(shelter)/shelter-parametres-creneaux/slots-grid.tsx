"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@shared/ui/button";
import {
  replaceShelterVisitSlots,
  DAY_LABELS_ISO,
  DAY_LABELS_SHORT_ISO,
  HALF_HOURS_FROM_8_TO_19,
  formatMinutes,
} from "@shelters/public.client";
import type { VisitSlot } from "@shelters/public";

const DAYS: Array<keyof typeof DAY_LABELS_ISO> = [1, 2, 3, 4, 5, 6, 7];

function keyOf(day: number, minutes: number): string {
  return `${day}_${minutes}`;
}

export function SlotsGrid({ initialSlots }: { initialSlots: VisitSlot[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialActive = useMemo(() => {
    const set = new Set<string>();
    for (const s of initialSlots) {
      if (s.isActive) set.add(keyOf(s.dayOfWeek, s.startMinutes));
    }
    return set;
  }, [initialSlots]);

  const [active, setActive] = useState<Set<string>>(new Set(initialActive));

  const dirty = useMemo(() => {
    if (active.size !== initialActive.size) return true;
    for (const k of active) if (!initialActive.has(k)) return true;
    return false;
  }, [active, initialActive]);

  function toggle(day: number, minutes: number) {
    const k = keyOf(day, minutes);
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleColumn(minutes: number) {
    const dayKeys = DAYS.map((d) => keyOf(d, minutes));
    setActive((prev) => {
      const next = new Set(prev);
      const allActive = dayKeys.every((k) => next.has(k));
      if (allActive) {
        for (const k of dayKeys) next.delete(k);
      } else {
        for (const k of dayKeys) next.add(k);
      }
      return next;
    });
  }

  function toggleRow(day: number) {
    const rowKeys = HALF_HOURS_FROM_8_TO_19.map((m) => keyOf(day, m));
    setActive((prev) => {
      const next = new Set(prev);
      const allActive = rowKeys.every((k) => next.has(k));
      if (allActive) {
        for (const k of rowKeys) next.delete(k);
      } else {
        for (const k of rowKeys) next.add(k);
      }
      return next;
    });
  }

  function reset() {
    setActive(new Set(initialActive));
  }

  function save() {
    const slots = Array.from(active).map((k) => {
      const [day, startMin] = k.split("_").map(Number);
      return {
        dayOfWeek: day!,
        startMinutes: startMin!,
        capacity: 1,
      };
    });
    startTransition(async () => {
      const result = await replaceShelterVisitSlots(slots);
      if (!result.success) {
        toast.error(result.error ?? "Sauvegarde impossible.");
        return;
      }
      toast.success(
        `Grille mise à jour (${slots.length} créneau${slots.length > 1 ? "x" : ""}).`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 z-20 bg-card px-2 py-2 text-left">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Jour
                </span>
              </th>
              {HALF_HOURS_FROM_8_TO_19.map((m) => {
                const isHourMark = m % 60 === 0;
                return (
                  <th
                    key={m}
                    className={`whitespace-nowrap border-b border-border px-1 py-2 text-center text-[10px] font-medium ${
                      isHourMark
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumn(m)}
                      className="hover:text-coral-600"
                      title={`Activer / désactiver ${formatMinutes(m)} sur tous les jours`}
                    >
                      {formatMinutes(m)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 whitespace-nowrap border-r border-border bg-card px-2 py-1.5 text-left text-xs font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => toggleRow(day)}
                    className="hover:text-coral-600"
                    title={`Activer / désactiver toute la journée du ${DAY_LABELS_ISO[day]}`}
                  >
                    <span className="hidden sm:inline">
                      {DAY_LABELS_ISO[day]}
                    </span>
                    <span className="sm:hidden">
                      {DAY_LABELS_SHORT_ISO[day]}
                    </span>
                  </button>
                </th>
                {HALF_HOURS_FROM_8_TO_19.map((m) => {
                  const k = keyOf(day, m);
                  const on = active.has(k);
                  return (
                    <td
                      key={m}
                      className="border-b border-border p-0.5 align-middle"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(day, m)}
                        aria-pressed={on}
                        className={`h-7 w-full min-w-[28px] rounded transition ${
                          on
                            ? "bg-coral-500 hover:bg-coral-600"
                            : "bg-sable-100 hover:bg-sable-200"
                        }`}
                        title={`${DAY_LABELS_ISO[day]} ${formatMinutes(m)}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{active.size}</strong> créneau
          {active.size > 1 ? "x" : ""} actif{active.size > 1 ? "s" : ""}
          {dirty && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              modifications non enregistrées
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            disabled={!dirty || isPending}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Revenir en arrière
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!dirty || isPending}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isPending ? "Enregistrement…" : "Enregistrer la grille"}
          </Button>
        </div>
      </div>
    </div>
  );
}
