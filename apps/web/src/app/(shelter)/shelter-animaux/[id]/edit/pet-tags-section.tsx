"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tags, Save } from "lucide-react";
import { Button } from "@shared/ui/button";
import {
  setPetTags,
  TAG_COLOR_CLASSES,
  type ShelterTag,
} from "@shelters/public.client";

interface Props {
  petId: string;
  availableTags: ShelterTag[];
  initialTagIds: string[];
}

export function PetTagsSection({
  petId,
  availableTags,
  initialTagIds,
}: Props) {
  const router = useRouter();
  const initial = useMemo(() => new Set(initialTagIds), [initialTagIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await setPetTags(petId, Array.from(selected));
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success("Étiquettes enregistrées.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <Tags className="h-4 w-4 text-coral-500" />
            Étiquettes
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cochez les étiquettes qui s&apos;appliquent à cet animal.{" "}
            <Link
              href="/shelter-parametres-tags"
              className="text-coral-600 hover:underline"
            >
              Gérer les étiquettes
            </Link>
          </p>
        </div>
      </header>

      <ul className="flex flex-wrap gap-2">
        {availableTags.map((t) => {
          const cl = TAG_COLOR_CLASSES[t.color];
          const on = selected.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => toggle(t.id)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition ${cl.bg} ${cl.text} ${on ? "border-foreground/40 shadow-sm" : "border-transparent opacity-60 hover:opacity-100"}`}
                title={t.isPublic ? "Visible côté public" : "Interne au refuge"}
              >
                {t.name}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty && (
          <span className="text-xs text-muted-foreground">
            modifications non enregistrées
          </span>
        )}
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={!dirty || isPending}
        >
          <Save className="mr-1 h-3.5 w-3.5" />
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </section>
  );
}
