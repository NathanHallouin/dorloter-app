import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi } from "@/api/shelter";
import { cn } from "@dorloter/ui";
import { Tag, MiniBtn, DashPageHead } from "@/components/dash/kit";

const FILTERS: [string, string][] = [["tous", "Toutes"], ["envoyee", "À traiter"], ["en_cours", "Entretien"], ["acceptee", "Acceptées"], ["refusee", "Refusées"]];

export function ShelterCandidaturesPage() {
  const queryClient = useQueryClient();
  const [f, setF] = useState("tous");
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => shelterApi.updateApplication(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shelter-applications"] }) });

  const petName = (id: string) => (pets.data ?? []).find((p) => p.id === id)?.name ?? "Animal";
  const list = (apps.data ?? []).filter((c) => f === "tous" || c.status === f);

  return (
    <div>
      <DashPageHead title="Candidatures" desc="Étudiez les dossiers, passez en entretien, puis acceptez ou refusez." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setF(v)} className={cn("h-[34px] cursor-pointer rounded-[8px] border px-[13px] text-[13px] font-semibold", f === v ? "border-coral-600 bg-coral-600 text-sable-50" : "border-line bg-card text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {apps.isError && <p className="text-brick-600">Accès refuge requis.</p>}
      {!apps.isLoading && list.length === 0 && <p className="text-muted-foreground">Aucune candidature dans cette catégorie.</p>}
      <div className="flex flex-col gap-3">
        {list.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-card p-4">
            <span className="grid h-[52px] w-[52px] flex-none place-items-center rounded-[10px] bg-tint-coral text-coral-600">🐾</span>
            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-[9px]">
                <span className="text-[16px] font-semibold text-foreground">Candidature · {petName(c.petId)}</span>
                <Tag s={c.status} />
              </div>
              <div className="mono mt-[5px] text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                {c.housingType ?? "logement ?"}{c.hasChildren ? " · avec enfants" : ""}{c.hasOtherPets ? " · autres animaux" : ""} · reçue le {new Date(c.createdAt).toLocaleDateString("fr-FR")}
              </div>
              <p className="mt-2 text-[14px] leading-[1.5] text-foreground">{c.motivation}</p>
            </div>
            <div className="flex gap-2">
              {c.status === "envoyee" && <MiniBtn label="Entretien" icon="message" onClick={() => update.mutate({ id: c.id, status: "en_cours" })} disabled={update.isPending} />}
              {c.status !== "acceptee" && <MiniBtn label="Accepter" icon="check" tone="green" onClick={() => update.mutate({ id: c.id, status: "acceptee" })} disabled={update.isPending} />}
              {c.status !== "refusee" && <MiniBtn label="Refuser" icon="x" tone="brick" onClick={() => update.mutate({ id: c.id, status: "refusee" })} disabled={update.isPending} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
