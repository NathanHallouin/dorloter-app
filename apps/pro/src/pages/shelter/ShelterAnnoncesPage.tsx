import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi, healthApi, registreApi } from "@dorloter/client";
import type { ShelterPetInput, ShelterPet, RegistreEntry, IntakeOrigin, OutcomeType } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { Btn } from "@dorloter/ui";
import { Field, Input, Textarea, Select, Segmented } from "@dorloter/ui";
import { Panel, Tag, MiniBtn, DashPageHead, Table, Td } from "@/components/dash/kit";

const emptyForm: ShelterPetInput = { name: "", species: "chat", status: "disponible" };

const ORIGIN: Record<IntakeOrigin, string> = {
  abandon: "Abandon", errance: "Errance", transfert: "Transfert", saisie: "Saisie", naissance: "Naissance", autre: "Autre",
};
const OUTCOME: Record<OutcomeType, string> = {
  adoption: "Adoption", transfert: "Transfert", deces: "Décès", retour_proprietaire: "Retour propriétaire", euthanasie: "Euthanasie", autre: "Autre",
};

/** Export CSV du registre légal d'entrée / sortie (obligation réglementaire). */
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

export function ShelterAnnoncesPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ShelterPetInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const upcoming = useQuery({ queryKey: ["health-upcoming"], queryFn: () => healthApi.upcoming(60) });
  const registre = useQuery({ queryKey: ["registre"], queryFn: () => registreApi.list() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shelter-pets"] });

  const create = useMutation({ mutationFn: (i: ShelterPetInput) => shelterApi.createPet(i), onSuccess: () => { setForm(emptyForm); setAdding(false); invalidate(); }, onError: (e) => setError(e instanceof ApiClientError ? e.message : "Erreur.") });

  const list = pets.data ?? [];
  const candCount = (petId: string) => (apps.data ?? []).filter((a) => a.petId === petId).length;
  const nextDue = (petId: string) => (upcoming.data ?? []).find((u) => u.petId === petId)?.event.nextDueDate ?? null;

  return (
    <div>
      <DashPageHead title="Animaux" desc="Chaque animal a sa fiche : annonce, santé, registre légal, candidatures et contrat au même endroit."
        action={
          <div className="flex gap-2">
            <Btn icon="arrow" variant="outline" onClick={() => exportCsv(registre.data ?? [])} disabled={(registre.data ?? []).length === 0}>Registre (CSV)</Btn>
            <Btn icon={adding ? "x" : "plus"} variant={adding ? "outline" : "primary"} onClick={() => { setAdding((a) => !a); setError(null); }}>{adding ? "Fermer" : "Ajouter un animal"}</Btn>
          </div>
        } />

      {adding && (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); create.mutate(form); }} className="mb-[22px] flex flex-col gap-[18px] rounded-card border border-line bg-card p-[22px]">
          <Field label="Espèce"><Segmented value={form.species} onChange={(v) => setForm({ ...form, species: v as "chat" | "chien" })} options={[{ value: "chat", label: "Chat", icon: "cat" }, { value: "chien", label: "Chien", icon: "dog" }]} /></Field>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Field label="Nom"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nala…" /></Field>
            <Field label="Âge"><Select value={form.ageCategory ?? ""} onChange={(e) => setForm({ ...form, ageCategory: e.target.value || undefined })} options={[{ value: "", label: "—" }, { value: "chaton", label: "Chaton" }, { value: "jeune", label: "Jeune" }, { value: "adulte", label: "Adulte" }, { value: "senior", label: "Senior" }]} /></Field>
            <Field label="Race"><Input value={form.breed ?? ""} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Européen…" /></Field>
            <Field label="Couleur"><Input value={form.color ?? ""} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Roux tigré…" /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Personnalité, histoire…" /></Field>
          {error && <p className="text-[13px] text-brick-600">{error}</p>}
          <div><Btn type="submit" icon="check" disabled={create.isPending}>{create.isPending ? "Ajout…" : "Publier l'annonce"}</Btn></div>
        </form>
      )}

      {pets.isError && <p className="text-brick-600">Accès refuge requis (compte shelter_admin).</p>}
      <Panel pad={false}>
        <div className="px-1 pt-1">
          {list.length === 0 ? <p className="p-[18px] text-muted-foreground">Aucune annonce pour le moment.</p> : (
            <Table head={["Animal", "Statut", "Candidatures", "Prochain soin", ""]}>
              {list.map((a) => (
                <PetRow key={a.id} pet={a} candidatures={candCount(a.id)} nextDue={nextDue(a.id)} />
              ))}
            </Table>
          )}
        </div>
      </Panel>
    </div>
  );
}

function PetRow({ pet, candidatures, nextDue }: { pet: ShelterPet; candidatures: number; nextDue: string | null }) {
  const overdue = nextDue != null && nextDue < new Date().toISOString().slice(0, 10);
  return (
    <tr>
      <Td>
        <Link to={`/refuge/animaux/${pet.id}`} className="flex items-center gap-[11px] group">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-[8px] bg-muted text-[20px]">{pet.species === "chat" ? "🐱" : "🐶"}</span>
          <div>
            <div className="font-display text-[16px] font-semibold group-hover:text-coral-700">{pet.name}</div>
            <div className="mono text-[10.5px] uppercase text-muted-foreground">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</div>
          </div>
        </Link>
      </Td>
      <Td><Tag s={pet.status} /></Td>
      <Td><span className="tabular">{candidatures}</span></Td>
      <Td>
        {nextDue ? (
          <span className={overdue ? "mono text-[12px] font-semibold text-brick-600" : "mono text-[12px] text-lavande-700"}>
            {new Date(nextDue).toLocaleDateString("fr-FR")}{overdue ? " · en retard" : ""}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </Td>
      <Td right>
        <Link to={`/refuge/animaux/${pet.id}`}><MiniBtn icon="arrow" label="Ouvrir" /></Link>
      </Td>
    </tr>
  );
}
