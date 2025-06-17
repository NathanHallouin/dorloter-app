import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { healthApi, shelterApi, type HealthEventType } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn, field, Select } from "@/components/dash/kit";

const TYPE_LABEL: Record<HealthEventType, string> = {
  vaccin: "Vaccin",
  vermifuge: "Vermifuge",
  antiparasitaire: "Antiparasitaire",
  sterilisation: "Stérilisation",
  test_fiv_felv: "Test FIV/FeLV",
  visite: "Visite véto",
  traitement: "Traitement",
  pesee: "Pesée",
  autre: "Autre",
};
const TYPES = Object.keys(TYPE_LABEL) as HealthEventType[];

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const today = () => new Date().toISOString().slice(0, 10);

export function ShelterHealthPage() {
  const qc = useQueryClient();
  const [petId, setPetId] = useState<string>("");

  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const upcoming = useQuery({ queryKey: ["health-upcoming"], queryFn: () => healthApi.upcoming(60) });
  const events = useQuery({
    queryKey: ["health", petId],
    queryFn: () => healthApi.listForPet(petId),
    enabled: !!petId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["health-upcoming"] });
    if (petId) qc.invalidateQueries({ queryKey: ["health", petId] });
  };
  const create = useMutation({
    mutationFn: (v: Parameters<typeof healthApi.create>[1]) => healthApi.create(petId, v),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => healthApi.remove(id), onSuccess: invalidate });

  const petName = (id: string) => (pets.data ?? []).find((p) => p.id === id)?.name ?? "Animal";

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : undefined);
    const str = (k: string) => (f.get(k) ? String(f.get(k)) : undefined);
    create.mutate({
      type: f.get("type") as HealthEventType,
      eventDate: str("eventDate"),
      label: str("label"),
      vetLabel: str("vetLabel"),
      nextDueDate: str("nextDueDate"),
      cost: num("cost"),
      weightKg: num("weightKg"),
      notes: str("notes"),
    });
    e.currentTarget.reset();
  }

  const due = upcoming.data ?? [];

  return (
    <div>
      <DashPageHead title="Santé" desc="Carnet de santé des animaux : vaccins, vermifuges, stérilisation, visites, traitements, pesées." />

      <Panel title="Échéances à venir" hint="Rappels dans les 60 jours (en retard en rouge)">
        {due.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune échéance à venir.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {due.map((u) => {
              const overdue = u.event.nextDueDate != null && u.event.nextDueDate < today();
              return (
                <li key={u.event.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", overdue ? "bg-brick-50 text-brick-600" : "bg-tint-lavande text-lavande-700")}>
                    {fmt(u.event.nextDueDate)}
                  </span>
                  <span className="font-semibold">{u.petName}</span>
                  <span className="text-muted-foreground">· {TYPE_LABEL[u.event.type]}{u.event.label ? ` · ${u.event.label}` : ""}</span>
                  {overdue && <span className="mono text-[11px] uppercase text-brick-600">en retard</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title="Carnet de santé par animal" hint="Sélectionnez un animal pour voir et compléter son suivi">
          <Select
            value={petId}
            onChange={setPetId}
            placeholder="Choisir un animal…"
            options={(pets.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
            className="mb-4 md:max-w-xs"
          />

          {petId && (
            <>
              <form onSubmit={onAdd} className="mb-5 grid gap-2 rounded-card border border-line p-3 md:grid-cols-4">
                <label className="text-xs text-muted-foreground">Type
                  <Select name="type" defaultValue="vaccin" options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} className="mt-1" />
                </label>
                <label className="text-xs text-muted-foreground">Date
                  <input type="date" name="eventDate" defaultValue={today()} className={cn(field, "mt-1")} />
                </label>
                <label className="text-xs text-muted-foreground">Libellé (produit, motif…)
                  <input name="label" className={cn(field, "mt-1")} />
                </label>
                <label className="text-xs text-muted-foreground">Rappel le
                  <input type="date" name="nextDueDate" className={cn(field, "mt-1")} />
                </label>
                <label className="text-xs text-muted-foreground">Vétérinaire
                  <input name="vetLabel" className={cn(field, "mt-1")} />
                </label>
                <label className="text-xs text-muted-foreground">Coût (€)
                  <input type="number" step="0.01" min="0" name="cost" className={cn(field, "mt-1")} />
                </label>
                <label className="text-xs text-muted-foreground">Poids (kg)
                  <input type="number" step="0.01" min="0" name="weightKg" className={cn(field, "mt-1")} />
                </label>
                <label className="text-xs text-muted-foreground">Notes
                  <input name="notes" className={cn(field, "mt-1")} />
                </label>
                <div className="md:col-span-4">
                  <MiniBtn label="Ajouter au carnet" icon="check" tone="green" />
                </div>
              </form>

              {events.isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : (events.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement de santé pour {petName(petId)}.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(events.data ?? []).map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-field border border-line px-3 py-2 text-sm">
                      <span className="mono text-[12px] text-muted-foreground">{fmt(h.eventDate)}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{TYPE_LABEL[h.type]}</span>
                      {h.label && <span className="font-medium">{h.label}</span>}
                      {h.weightKg != null && <span className="text-muted-foreground">{h.weightKg} kg</span>}
                      {h.vetLabel && <span className="text-muted-foreground">· {h.vetLabel}</span>}
                      {h.cost != null && <span className="text-muted-foreground">· {h.cost} €</span>}
                      {h.nextDueDate && <span className="text-lavande-700">· rappel {fmt(h.nextDueDate)}</span>}
                      <button type="button" onClick={() => remove.mutate(h.id)} disabled={remove.isPending} className="ml-auto text-xs text-brick-600 hover:underline">Supprimer</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
