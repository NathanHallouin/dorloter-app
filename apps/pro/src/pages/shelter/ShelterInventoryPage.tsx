import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi, type InventoryCategory, type InventoryItem } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn, field, Select } from "@/components/dash/kit";

const CAT: Record<InventoryCategory, string> = {
  alimentation: "Alimentation", litiere: "Litière", medical: "Médical", materiel: "Matériel", autre: "Autre",
};
const CATS = Object.keys(CAT) as InventoryCategory[];
const isLow = (i: InventoryItem) => i.threshold != null && i.quantity <= i.threshold;
const qty = (i: InventoryItem) => `${i.quantity}${i.unit ? ` ${i.unit}` : ""}`;

export function ShelterInventoryPage() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<string | null>(null);
  const items = useQuery({ queryKey: ["inventory"], queryFn: () => inventoryApi.list() });
  const inv = () => qc.invalidateQueries({ queryKey: ["inventory"] });

  const create = useMutation({ mutationFn: inventoryApi.create, onSuccess: inv });
  const update = useMutation({ mutationFn: (v: { id: string; quantity?: number; threshold?: number; unit?: string }) => inventoryApi.update(v.id, v), onSuccess: () => { inv(); setEdit(null); } });
  const adjust = useMutation({ mutationFn: (v: { id: string; delta: number }) => inventoryApi.adjust(v.id, v.delta), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: string) => inventoryApi.remove(id), onSuccess: inv });

  const list = items.data ?? [];
  const needs = list.filter(isLow);
  const input = field;

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      name: String(f.get("name") ?? ""),
      category: (f.get("category") as InventoryCategory) || "autre",
      quantity: f.get("quantity") ? Number(f.get("quantity")) : 0,
      unit: f.get("unit") ? String(f.get("unit")) : undefined,
      threshold: f.get("threshold") ? Number(f.get("threshold")) : undefined,
    });
    e.currentTarget.reset();
  }
  function onEdit(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update.mutate({
      id,
      quantity: f.get("quantity") !== "" ? Number(f.get("quantity")) : undefined,
      threshold: f.get("threshold") !== "" ? Number(f.get("threshold")) : undefined,
      unit: f.get("unit") ? String(f.get("unit")) : undefined,
    });
  }

  return (
    <div>
      <DashPageHead title="Stock & besoins" desc="Suivez vos stocks (alimentation, litière, matériel) et repérez les besoins en un coup d'œil." />

      <Panel title="Ajouter un article">
        <form onSubmit={onAdd} className="grid gap-2 md:grid-cols-5">
          <input name="name" required placeholder="Article (ex. Croquettes chaton)" className={cn(input, "md:col-span-2")} />
          <Select name="category" defaultValue="alimentation" options={CATS.map((c) => ({ value: c, label: CAT[c] }))} />
          <input name="quantity" type="number" step="0.01" min="0" placeholder="Quantité" className={input} />
          <input name="unit" placeholder="Unité (kg, sac…)" className={input} />
          <input name="threshold" type="number" step="0.01" min="0" placeholder="Seuil d'alerte" className={input} />
          <div className="md:col-span-5"><MiniBtn label="Ajouter au stock" icon="check" tone="green" /></div>
        </form>
      </Panel>

      {needs.length > 0 && (
        <div className="mt-4 rounded-card border border-brick-300 bg-brick-50 p-4">
          <div className="mono mb-1 text-[11px] uppercase tracking-wide text-brick-600">Besoins (sous le seuil)</div>
          <p className="text-sm text-foreground">{needs.map((i) => `${i.name} (${qty(i)})`).join(" · ")}</p>
        </div>
      )}

      {items.isError && <p className="mt-4 text-brick-600">Accès refuge requis.</p>}

      <div className="mt-6 flex flex-col gap-2">
        {list.map((i) => (
          <div key={i.id} className="rounded-card border border-line bg-card p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{i.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{CAT[i.category]}</span>
              <span className={cn("font-medium", isLow(i) && "text-brick-600")}>{qty(i)}</span>
              {i.threshold != null && <span className="text-[12px] text-muted-foreground">seuil {i.threshold}</span>}
              {isLow(i) && <span className="rounded-full bg-brick-50 px-2 py-0.5 text-[11px] font-semibold text-brick-600">à réapprovisionner</span>}
              <div className="ml-auto flex items-center gap-1.5">
                <button type="button" onClick={() => adjust.mutate({ id: i.id, delta: -1 })} className="grid size-7 place-items-center rounded-field border border-line hover:bg-muted">−</button>
                <button type="button" onClick={() => adjust.mutate({ id: i.id, delta: 1 })} className="grid size-7 place-items-center rounded-field border border-line hover:bg-muted">+</button>
                <MiniBtn label={edit === i.id ? "Fermer" : "Éditer"} icon="sliders" onClick={() => setEdit(edit === i.id ? null : i.id)} />
                <button type="button" onClick={() => del.mutate(i.id)} className="text-xs text-brick-600 hover:underline">Suppr.</button>
              </div>
            </div>
            {edit === i.id && (
              <form onSubmit={(e) => onEdit(e, i.id)} className="mt-3 grid gap-2 border-t border-line pt-3 md:grid-cols-4">
                <label className="text-xs text-muted-foreground">Quantité<input name="quantity" type="number" step="0.01" min="0" defaultValue={i.quantity} className={cn(input, "mt-1 w-full")} /></label>
                <label className="text-xs text-muted-foreground">Unité<input name="unit" defaultValue={i.unit ?? ""} className={cn(input, "mt-1 w-full")} /></label>
                <label className="text-xs text-muted-foreground">Seuil<input name="threshold" type="number" step="0.01" min="0" defaultValue={i.threshold ?? ""} className={cn(input, "mt-1 w-full")} /></label>
                <div className="flex items-end"><MiniBtn label="Enregistrer" icon="check" tone="green" /></div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
