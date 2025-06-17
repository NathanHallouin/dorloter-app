import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registreApi, type IntakeOrigin, type OutcomeType, type RegistreEntry } from "@dorloter/client";
import { Stat, Panel, MiniBtn, DashPageHead, Table, Td, field, Select } from "@/components/dash/kit";
import { Btn } from "@dorloter/ui";

const ORIGIN: Record<IntakeOrigin, string> = {
  abandon: "Abandon", errance: "Errance", transfert: "Transfert", saisie: "Saisie", naissance: "Naissance", autre: "Autre",
};
const OUTCOME: Record<OutcomeType, string> = {
  adoption: "Adoption", transfert: "Transfert", deces: "Décès", retour_proprietaire: "Retour propriétaire", euthanasie: "Euthanasie", autre: "Autre",
};
const ORIGINS = Object.keys(ORIGIN) as IntakeOrigin[];
const OUTCOMES = Object.keys(OUTCOME) as OutcomeType[];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

function exportCsv(rows: RegistreEntry[]) {
  const head = ["Nom", "Espèce", "ICAD", "Entrée", "Provenance", "Sortie", "Motif sortie", "Statut"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [
    r.name, r.species, r.icadNumber ?? "", r.intakeDate ?? "",
    r.intakeOrigin ? ORIGIN[r.intakeOrigin] : "", r.outcomeDate ?? "",
    r.outcomeType ? OUTCOME[r.outcomeType] : "", r.status,
  ].map((c) => esc(String(c))).join(";"));
  const csv = [head.join(";"), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "registre-dorloter.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ShelterRegistrePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);

  const registre = useQuery({ queryKey: ["registre"], queryFn: () => registreApi.list() });
  const stats = useQuery({ queryKey: ["registre-stats"], queryFn: () => registreApi.stats() });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["registre"] });
    qc.invalidateQueries({ queryKey: ["registre-stats"] });
  };
  const intake = useMutation({ mutationFn: (v: { id: string; date?: string; origin?: IntakeOrigin; icadNumber?: string }) => registreApi.setIntake(v.id, { date: v.date, origin: v.origin, icadNumber: v.icadNumber }), onSuccess: inv });
  const outcome = useMutation({ mutationFn: (v: { id: string; date?: string; type?: OutcomeType }) => registreApi.setOutcome(v.id, { date: v.date, type: v.type }), onSuccess: inv });

  const rows = registre.data ?? [];
  const s = stats.data;
  const input = field;

  function onIntake(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    intake.mutate({ id, date: String(f.get("date") || "") || undefined, origin: (f.get("origin") as IntakeOrigin) || undefined, icadNumber: String(f.get("icad") || "") || undefined });
  }
  function onOutcome(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    outcome.mutate({ id, date: String(f.get("date") || "") || undefined, type: (f.get("type") as OutcomeType) || undefined });
  }

  return (
    <div>
      <DashPageHead
        title="Registre & statistiques"
        desc="Registre d'entrée et de sortie des animaux (obligation légale) et indicateurs de pilotage."
        action={<Btn icon="arrow" onClick={() => exportCsv(rows)}>Exporter (CSV)</Btn>}
      />

      <div className="dash-stats mb-6 grid grid-cols-4 gap-3.5">
        <Stat icon="heart" label="Animaux présents" value={String(s?.present ?? "—")} sub={s ? `${s.presentCats} chats · ${s.presentDogs} chiens` : ""} />
        <Stat icon="arrow" label="Entrées cette année" value={String(s?.enteredThisYear ?? "—")} tone="lavande" />
        <Stat icon="badgeCheck" label="Adoptions cette année" value={String(s?.adoptionsThisYear ?? "—")} tone="prune" />
        <Stat icon="clock" label="Durée moyenne de séjour" value={s?.avgStayDays != null ? `${Math.round(s.avgStayDays)} j` : "—"} tone="coral" />
      </div>

      <Panel title="Registre" hint={`${rows.length} animal(aux)`} pad={false}>
        <div className="px-1 pt-1">
          {registre.isError && <p className="p-4 text-brick-600">Accès refuge requis.</p>}
          {rows.length > 0 && (
            <Table head={["Animal", "ICAD", "Entrée", "Sortie", "Statut", ""]}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td><span className="font-semibold">{r.name}</span> <span className="text-muted-foreground">{r.species === "chat" ? "Chat" : "Chien"}</span></Td>
                  <Td><span className="mono text-[12px] text-muted-foreground">{r.icadNumber ?? "—"}</span></Td>
                  <Td><span className="text-[13px]">{fmt(r.intakeDate)}{r.intakeOrigin ? ` · ${ORIGIN[r.intakeOrigin]}` : ""}</span></Td>
                  <Td><span className="text-[13px]">{fmt(r.outcomeDate)}{r.outcomeType ? ` · ${OUTCOME[r.outcomeType]}` : ""}</span></Td>
                  <Td><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{r.status}</span></Td>
                  <Td right><MiniBtn label={open === r.id ? "Fermer" : "Éditer"} icon="sliders" onClick={() => setOpen(open === r.id ? null : r.id)} /></Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>

      {open && (() => {
        const r = rows.find((x) => x.id === open);
        if (!r) return null;
        return (
          <div className="mt-4 grid gap-4 rounded-card border border-line bg-card p-4 md:grid-cols-2">
            <form onSubmit={(e) => onIntake(e, r.id)}>
              <div className="mono mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Entrée · {r.name}</div>
              <div className="grid gap-2">
                <input name="date" type="date" defaultValue={r.intakeDate ?? ""} className={input} />
                <Select name="origin" defaultValue={r.intakeOrigin ?? ""} options={[{ value: "", label: "Provenance…" }, ...ORIGINS.map((o) => ({ value: o, label: ORIGIN[o] }))]} />
                <input name="icad" defaultValue={r.icadNumber ?? ""} placeholder="N° ICAD" className={input} />
                <div><MiniBtn label="Enregistrer l'entrée" icon="check" tone="green" /></div>
              </div>
            </form>
            <form onSubmit={(e) => onOutcome(e, r.id)}>
              <div className="mono mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Sortie · {r.name}</div>
              <div className="grid gap-2">
                <input name="date" type="date" defaultValue={r.outcomeDate ?? ""} className={input} />
                <Select name="type" defaultValue={r.outcomeType ?? ""} options={[{ value: "", label: "Motif de sortie…" }, ...OUTCOMES.map((o) => ({ value: o, label: OUTCOME[o] }))]} />
                <div><MiniBtn label="Enregistrer la sortie" icon="check" /></div>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
}
