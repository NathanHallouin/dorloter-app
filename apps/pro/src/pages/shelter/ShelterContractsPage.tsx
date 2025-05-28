import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contractsApi,
  shelterApi,
  fosterApi,
  type Contract,
  type ContractStatus,
} from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn } from "@/components/dash/kit";

const STATUS_LABEL: Record<ContractStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  signe: "Signé",
  active: "Active",
  terminee: "Terminée",
  resilie: "Résilié",
  annule: "Annulé",
};

const STATUS_TONE: Record<ContractStatus, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoye: "bg-tint-lavande text-lavande-700",
  signe: "bg-tint-coral text-coral-700",
  active: "bg-tint-coral text-coral-700",
  terminee: "bg-muted text-muted-foreground",
  resilie: "bg-brick-50 text-brick-600",
  annule: "bg-brick-50 text-brick-600",
};

const FILTERS: [string, string][] = [
  ["tous", "Tous"],
  ["adoption", "Adoption"],
  ["foster", "Famille d'accueil"],
];

export function ShelterContractsPage() {
  const qc = useQueryClient();
  const [f, setF] = useState("tous");
  const [open, setOpen] = useState<string | null>(null);

  const contracts = useQuery({ queryKey: ["shelter-contracts"], queryFn: () => contractsApi.list() });
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const fosters = useQuery({ queryKey: ["shelter-fosters"], queryFn: () => fosterApi.list() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["shelter-contracts"] });
  const createAdoption = useMutation({ mutationFn: (applicationId: string) => contractsApi.createAdoption({ applicationId }), onSuccess: invalidate });
  const createFoster = useMutation({ mutationFn: (fosterFamilyId: string) => contractsApi.createFoster({ fosterFamilyId }), onSuccess: invalidate });
  const setStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: ContractStatus }) => contractsApi.setStatus(id, status), onSuccess: invalidate });

  const petName = (id: string | null) => (id ? (pets.data ?? []).find((p) => p.id === id)?.name ?? "Animal" : "—");
  const list = (contracts.data ?? []).filter((c) => f === "tous" || c.type === f);

  // Candidatures acceptées sans contrat encore généré.
  const withContract = new Set((contracts.data ?? []).map((c) => c.applicationId).filter(Boolean));
  const toGenerate = (apps.data ?? []).filter((a) => a.status === "acceptee" && !withContract.has(a.id));

  const actions = (c: Contract) => {
    const b: { label: string; status: ContractStatus; tone?: "green" | "brick" | "sable" }[] = [];
    if (c.type === "adoption") {
      if (c.status === "brouillon") b.push({ label: "Envoyer", status: "envoye" });
      if (c.status === "envoye") b.push({ label: "Marquer signé", status: "signe", tone: "green" });
      if (c.status === "signe") b.push({ label: "Résilier", status: "resilie", tone: "brick" });
    } else {
      if (c.status === "brouillon") b.push({ label: "Activer", status: "active", tone: "green" });
      if (c.status === "active") b.push({ label: "Terminer", status: "terminee" });
    }
    return b;
  };

  return (
    <div>
      <DashPageHead
        title="Contrats"
        desc="Contrats d'adoption et conventions de famille d'accueil. À la signature d'une adoption, l'animal passe « adopté »."
      />

      {/* Génération */}
      <Panel title="Générer un contrat" hint="Depuis une candidature acceptée ou une famille d'accueil">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mono mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Adoption · candidatures acceptées</div>
            {toGenerate.length === 0 && <p className="text-sm text-muted-foreground">Aucune candidature acceptée en attente de contrat.</p>}
            {toGenerate.map((a) => (
              <div key={a.id} className="mb-2 flex items-center justify-between gap-3 rounded-field border border-line px-3 py-2">
                <span className="text-sm">Candidature · {petName(a.petId)}</span>
                <MiniBtn label="Générer" icon="check" tone="green" onClick={() => createAdoption.mutate(a.id)} disabled={createAdoption.isPending} />
              </div>
            ))}
          </div>
          <div>
            <div className="mono mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Famille d'accueil</div>
            {(fosters.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune famille d'accueil active.</p>}
            {(fosters.data ?? []).map((fam) => (
              <div key={fam.id} className="mb-2 flex items-center justify-between gap-3 rounded-field border border-line px-3 py-2">
                <span className="text-sm">{fam.name ?? "Famille d'accueil"}</span>
                <MiniBtn label="Convention" icon="home" onClick={() => createFoster.mutate(fam.id)} disabled={createFoster.isPending} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Liste */}
      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setF(v)} className={cn("h-[34px] cursor-pointer rounded-[8px] border px-[13px] text-[13px] font-semibold", f === v ? "border-coral-600 bg-coral-600 text-sable-50" : "border-line bg-card text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {contracts.isError && <p className="text-brick-600">Accès refuge requis.</p>}
      {!contracts.isLoading && list.length === 0 && <p className="text-muted-foreground">Aucun contrat.</p>}

      <div className="flex flex-col gap-3">
        {list.map((c) => (
          <div key={c.id} className="rounded-card border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="mono text-[12px] font-semibold text-foreground">{c.reference}</span>
              <span className="mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {c.type === "adoption" ? "Adoption" : "Famille d'accueil"} · {petName(c.petId)}
              </span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
              {c.adoptionFee != null && <span className="text-[12px] text-muted-foreground">{c.adoptionFee} €</span>}
              <div className="ml-auto flex gap-2">
                <MiniBtn label={open === c.id ? "Masquer" : "Clauses"} icon="sliders" onClick={() => setOpen(open === c.id ? null : c.id)} />
                {actions(c).map((a) => (
                  <MiniBtn key={a.status} label={a.label} icon="check" tone={a.tone} onClick={() => setStatus.mutate({ id: c.id, status: a.status })} disabled={setStatus.isPending} />
                ))}
              </div>
            </div>
            {open === c.id && (
              <div className="mt-3 border-t border-line pt-3 text-[13px]">
                {Object.keys(c.terms).length === 0 ? (
                  <p className="text-muted-foreground">Aucune clause renseignée.</p>
                ) : (
                  <ul className="grid gap-1 md:grid-cols-2">
                    {Object.entries(c.terms).map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-3 border-b border-line/60 py-1">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium">{typeof v === "boolean" ? (v ? "Oui" : "Non") : String(v)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {c.notes && <p className="mt-2 text-muted-foreground">{c.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
