import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi } from "@dorloter/client";
import type { ShelterPetInput } from "@dorloter/client";
import type { ShelterPet } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { Btn } from "@dorloter/ui";
import { Field, Input, Textarea, Select, Segmented } from "@dorloter/ui";
import { Panel, Tag, MiniBtn, DashPageHead, Table, Td } from "@/components/dash/kit";

const emptyForm: ShelterPetInput = { name: "", species: "chat", status: "disponible" };

function toInput(p: ShelterPet): ShelterPetInput {
  return { name: p.name, species: p.species, status: p.status, sex: p.sex, breed: p.breed ?? undefined, color: p.color ?? undefined, ageCategory: p.ageCategory ?? undefined, description: p.description ?? undefined, adoptionFee: p.adoptionFee ?? undefined, isSterilized: p.isSterilized, isChipped: p.isChipped, isVaccinated: p.isVaccinated };
}

export function ShelterAnnoncesPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ShelterPetInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shelter-pets"] });

  const create = useMutation({ mutationFn: (i: ShelterPetInput) => shelterApi.createPet(i), onSuccess: () => { setForm(emptyForm); setAdding(false); invalidate(); }, onError: (e) => setError(e instanceof ApiClientError ? e.message : "Erreur.") });
  const setStatus = useMutation({ mutationFn: ({ pet, status }: { pet: ShelterPet; status: string }) => shelterApi.updatePet(pet.id, { ...toInput(pet), status }), onSuccess: invalidate });

  const list = pets.data ?? [];
  const candCount = (petId: string) => (apps.data ?? []).filter((a) => a.petId === petId).length;

  return (
    <div>
      <DashPageHead title="Mes annonces" desc="Gérez les animaux à l'adoption : mettez en avant, en pause, ou marquez comme adopté."
        action={<Btn icon={adding ? "x" : "plus"} variant={adding ? "outline" : "primary"} onClick={() => { setAdding((a) => !a); setError(null); }}>{adding ? "Fermer" : "Ajouter un animal"}</Btn>} />

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
            <Table head={["Animal", "Statut", "Candidatures", "Ajouté le", ""]}>
              {list.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <div className="flex items-center gap-[11px]">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-[8px] bg-muted text-[20px]">{a.species === "chat" ? "🐱" : "🐶"}</span>
                      <div><div className="font-display text-[16px] font-semibold">{a.name}</div><div className="mono text-[10.5px] uppercase text-muted-foreground">{a.species}{a.breed ? ` · ${a.breed}` : ""}</div></div>
                    </div>
                  </Td>
                  <Td><Tag s={a.status} /></Td>
                  <Td><span className="tabular">{candCount(a.id)}</span></Td>
                  <Td><span className="mono text-[12px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("fr-FR")}</span></Td>
                  <Td right>
                    <div className="inline-flex gap-1.5">
                      {a.status === "disponible" ? (
                        <MiniBtn icon="pause" label="Pause" onClick={() => setStatus.mutate({ pet: a, status: "retire" })} disabled={setStatus.isPending} />
                      ) : a.status !== "adopte" ? (
                        <MiniBtn icon="eye" label="En ligne" onClick={() => setStatus.mutate({ pet: a, status: "disponible" })} disabled={setStatus.isPending} />
                      ) : null}
                      {a.status !== "adopte" && <MiniBtn icon="badgeCheck" label="Adopté" tone="green" onClick={() => setStatus.mutate({ pet: a, status: "adopte" })} disabled={setStatus.isPending} />}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>
    </div>
  );
}
