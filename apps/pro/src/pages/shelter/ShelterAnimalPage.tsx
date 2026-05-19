import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  shelterApi,
  uploadsApi,
  healthApi,
  registreApi,
  contractsApi,
  fosterApi,
  type ShelterPet,
  type ShelterPetInput,
  type HealthEventType,
  type IntakeOrigin,
  type OutcomeType,
} from "@dorloter/client";
import { cn, Btn, Field, Input, Textarea, Icon, DatePicker } from "@dorloter/ui";
import { Panel, MiniBtn, Tag, field, Select } from "@/components/dash/kit";

/* --------------------------------- libellés -------------------------------- */
const HEALTH_LABEL: Record<HealthEventType, string> = {
  vaccin: "Vaccin", vermifuge: "Vermifuge", antiparasitaire: "Antiparasitaire",
  sterilisation: "Stérilisation", test_fiv_felv: "Test FIV/FeLV", visite: "Visite véto",
  traitement: "Traitement", pesee: "Pesée", autre: "Autre",
};
const HEALTH_TYPES = Object.keys(HEALTH_LABEL) as HealthEventType[];
const ORIGIN: Record<IntakeOrigin, string> = {
  abandon: "Abandon", errance: "Errance", transfert: "Transfert", saisie: "Saisie", naissance: "Naissance", autre: "Autre",
};
const OUTCOME: Record<OutcomeType, string> = {
  adoption: "Adoption", transfert: "Transfert", deces: "Décès", retour_proprietaire: "Retour propriétaire", euthanasie: "Euthanasie", autre: "Autre",
};
const ORIGINS = Object.keys(ORIGIN) as IntakeOrigin[];
const OUTCOMES = Object.keys(OUTCOME) as OutcomeType[];
const COMPAT = [
  { value: "oui", label: "Oui" }, { value: "non", label: "Non" }, { value: "inconnu", label: "Inconnu" },
];
const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const today = () => new Date().toISOString().slice(0, 10);

function petToInput(p: ShelterPet): ShelterPetInput {
  return {
    name: p.name, species: p.species, status: p.status, sex: p.sex,
    breed: p.breed ?? undefined, color: p.color ?? undefined, ageCategory: p.ageCategory ?? undefined,
    description: p.description ?? undefined, adoptionFee: p.adoptionFee ?? undefined,
    isSterilized: p.isSterilized, isChipped: p.isChipped, isVaccinated: p.isVaccinated,
    okWithCats: p.okWithCats, okWithDogs: p.okWithDogs, okWithChildren: p.okWithChildren,
    specialNeeds: p.specialNeeds ?? undefined, fivFelv: p.fivFelv ?? undefined,
    indoorOnly: p.indoorOnly ?? undefined,
  };
}

/**
 * Fiche complète d'un animal : tout ce qui le concerne sur une seule page
 * (annonce, santé, registre légal, candidatures, contrat, accueil).
 */
export function ShelterAnimalPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();

  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const health = useQuery({ queryKey: ["health", id], queryFn: () => healthApi.listForPet(id), enabled: !!id });
  const registre = useQuery({ queryKey: ["registre"], queryFn: () => registreApi.list() });
  const contracts = useQuery({ queryKey: ["shelter-contracts"], queryFn: () => contractsApi.list() });
  const fosters = useQuery({ queryKey: ["shelter-fosters"], queryFn: () => fosterApi.list() });

  const pet = (pets.data ?? []).find((p) => p.id === id);
  const petApps = (apps.data ?? []).filter((a) => a.petId === id);
  const petContracts = (contracts.data ?? []).filter((c) => c.petId === id);
  const reg = (registre.data ?? []).find((r) => r.id === id);
  const placement = (fosters.data ?? [])
    .flatMap((fam) => fam.placements.map((pl) => ({ fam, pl })))
    .find((x) => x.pl.petId === id);

  if (pets.isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (!pet) return (
    <div>
      <Link to="/refuge/animaux" className="mono text-[12px] text-muted-foreground hover:text-foreground">← Animaux</Link>
      <p className="mt-4 text-brick-600">Animal introuvable.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <AnimalHeader pet={pet} qc={qc} />

      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <FicheSection pet={pet} qc={qc} />
          <PhotosSection petId={id} petName={pet.name} qc={qc} />
          <HealthSection petId={id} petName={pet.name} events={health} qc={qc} />
        </div>
        <div className="flex flex-col gap-5">
          <RegistreSection petId={id} reg={reg} qc={qc} />
          <CandidaturesSection apps={petApps} qc={qc} />
          <AdoptionSection apps={petApps} contracts={petContracts} placement={placement} qc={qc} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- header ---------------------------------- */
function AnimalHeader({ pet, qc }: { pet: ShelterPet; qc: ReturnType<typeof useQueryClient> }) {
  const setStatus = useMutation({
    mutationFn: (status: string) => shelterApi.updatePet(pet.id, { ...petToInput(pet), status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shelter-pets"] }),
  });
  return (
    <div>
      <Link to="/refuge/animaux" className="mono text-[12px] text-muted-foreground hover:text-foreground">← Animaux</Link>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <span className="grid h-[58px] w-[58px] flex-none place-items-center rounded-[12px] bg-muted text-[30px]">{pet.species === "chat" ? "🐱" : "🐶"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-foreground">{pet.name}</h1>
            <Tag s={pet.status} />
          </div>
          <p className="mono mt-1 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
            {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}{pet.color ? ` · ${pet.color}` : ""}{pet.ageCategory ? ` · ${pet.ageCategory}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/refuge/animaux/${pet.id}/fiche-cage`}>
            <MiniBtn icon="grid" label="Fiche cage" />
          </Link>
          {pet.status === "disponible" ? (
            <MiniBtn icon="pause" label="Mettre en pause" onClick={() => setStatus.mutate("retire")} disabled={setStatus.isPending} />
          ) : pet.status !== "adopte" ? (
            <MiniBtn icon="eye" label="Remettre en ligne" onClick={() => setStatus.mutate("disponible")} disabled={setStatus.isPending} />
          ) : null}
          {pet.status !== "adopte" && <MiniBtn icon="badgeCheck" label="Adopté" tone="green" onClick={() => setStatus.mutate("adopte")} disabled={setStatus.isPending} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- fiche ---------------------------------- */
function FicheSection({ pet, qc }: { pet: ShelterPet; qc: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState<ShelterPetInput>(() => petToInput(pet));
  const [saved, setSaved] = useState(false);
  // Resynchronise si l'animal change (navigation entre fiches).
  useEffect(() => { setForm(petToInput(pet)); setSaved(false); }, [pet.id]);

  const save = useMutation({
    mutationFn: () => shelterApi.updatePet(pet.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shelter-pets"] }); setSaved(true); },
  });
  const set = (patch: Partial<ShelterPetInput>) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); };
  const isCat = pet.species === "chat";

  return (
    <Panel title="Fiche d'adoption" hint="Annonce publique" action={
      <Btn icon="check" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "…" : saved ? "Enregistré" : "Enregistrer"}</Btn>
    }>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Âge">
          <Select value={form.ageCategory ?? ""} onChange={(v) => set({ ageCategory: v || undefined })}
            options={[{ value: "", label: "—" }, { value: "chaton", label: "Chaton" }, { value: "jeune", label: "Jeune" }, { value: "adulte", label: "Adulte" }, { value: "senior", label: "Senior" }]} />
        </Field>
        <Field label="Race"><Input value={form.breed ?? ""} onChange={(e) => set({ breed: e.target.value })} placeholder="Européen…" /></Field>
        <Field label="Couleur"><Input value={form.color ?? ""} onChange={(e) => set({ color: e.target.value })} placeholder="Roux tigré…" /></Field>
        <Field label="Sexe">
          <Select value={form.sex ?? ""} onChange={(v) => set({ sex: v || undefined })}
            options={[{ value: "", label: "—" }, { value: "male", label: "Mâle" }, { value: "femelle", label: "Femelle" }, { value: "inconnu", label: "Inconnu" }]} />
        </Field>
        <Field label="Frais d'adoption (€)">
          <Input type="number" min="0" value={form.adoptionFee ?? ""} onChange={(e) => set({ adoptionFee: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Personnalité, histoire…" />
          </Field>
        </div>

        <Field label="OK chats"><Select value={form.okWithCats ?? "inconnu"} onChange={(v) => set({ okWithCats: v })} options={COMPAT} /></Field>
        <Field label="OK chiens"><Select value={form.okWithDogs ?? "inconnu"} onChange={(v) => set({ okWithDogs: v })} options={COMPAT} /></Field>
        <Field label="OK enfants"><Select value={form.okWithChildren ?? "inconnu"} onChange={(v) => set({ okWithChildren: v })} options={COMPAT} /></Field>

        {isCat && (
          <Field label="FIV / FeLV">
            <Select value={form.fivFelv ?? ""} onChange={(v) => set({ fivFelv: v || undefined })}
              options={[{ value: "", label: "—" }, { value: "non_teste", label: "Non testé" }, { value: "negatif", label: "Négatif" }, { value: "fiv_positif", label: "FIV+" }, { value: "felv_positif", label: "FeLV+" }, { value: "fiv_felv_positif", label: "FIV+ FeLV+" }]} />
          </Field>
        )}

        <div className="flex flex-wrap gap-4 sm:col-span-2">
          <Check label="Stérilisé" checked={!!form.isSterilized} onChange={(v) => set({ isSterilized: v })} />
          <Check label="Identifié (puce)" checked={!!form.isChipped} onChange={(v) => set({ isChipped: v })} />
          <Check label="Vacciné" checked={!!form.isVaccinated} onChange={(v) => set({ isVaccinated: v })} />
          {isCat && <Check label="Vie en intérieur" checked={!!form.indoorOnly} onChange={(v) => set({ indoorOnly: v })} />}
        </div>

        <div className="sm:col-span-2">
          <Field label="Besoins spécifiques">
            <Textarea value={form.specialNeeds ?? ""} onChange={(e) => set({ specialNeeds: e.target.value })} placeholder="Régime, traitement en cours…" />
          </Field>
        </div>
      </form>
    </Panel>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

/* --------------------------------- photos ---------------------------------- */
/**
 * Galerie de l'annonce. Le fichier part directement au stockage objet via une
 * URL signée : l'API ne voit passer que l'URL finale, jamais le binaire.
 *
 * La photo principale est celle qui illustre la carte du catalogue public, d'où
 * le fait qu'elle soit désignable explicitement.
 */
function PhotosSection({ petId, petName, qc }: {
  petId: string; petName: string; qc: ReturnType<typeof useQueryClient>;
}) {
  const [error, setError] = useState<string | null>(null);
  const photos = useQuery({ queryKey: ["pet-photos", petId], queryFn: () => shelterApi.petPhotos(petId) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["pet-photos", petId] });

  const add = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadsApi.uploadFile(file, "pet");
      // Première photo de la galerie : elle devient d'office la principale.
      await shelterApi.addPetPhoto(petId, url, (photos.data?.length ?? 0) === 0);
    },
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Envoi impossible."),
  });
  const remove = useMutation({ mutationFn: (id: string) => shelterApi.deletePetPhoto(petId, id), onSuccess: invalidate });
  const setPrimary = useMutation({ mutationFn: (id: string) => shelterApi.setPrimaryPetPhoto(petId, id), onSuccess: invalidate });

  const list = photos.data ?? [];

  return (
    <Panel title="Photos" hint="JPEG, PNG ou WebP · 5 Mo maximum par photo">
      <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-line px-4 py-6 text-sm text-muted-foreground hover:border-coral-400 hover:text-foreground">
        <Icon name="download" size={18} />
        {add.isPending ? "Envoi en cours…" : "Ajouter une photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={add.isPending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) add.mutate(file);
            e.target.value = "";
          }}
        />
      </label>

      {error && <p className="mb-3 text-sm font-semibold text-brick-600">{error}</p>}

      {photos.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune photo pour {petName}. Une belle photo est ce qui décide le plus souvent d'une adoption.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {list.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-card border border-line">
              <img src={p.url} alt="" className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                {p.isPrimary ? (
                  <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-coral-700">Principale</span>
                ) : (
                  <button type="button" onClick={() => setPrimary.mutate(p.id)} disabled={setPrimary.isPending}
                    className="text-[11.5px] text-muted-foreground hover:underline">
                    Définir principale
                  </button>
                )}
                <button type="button" onClick={() => remove.mutate(p.id)} disabled={remove.isPending}
                  className="text-[11.5px] text-brick-600 hover:underline">
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------------------------- santé ---------------------------------- */
function HealthSection({ petId, petName, events, qc }: {
  petId: string; petName: string;
  events: ReturnType<typeof useQuery>; qc: ReturnType<typeof useQueryClient>;
}) {
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["health", petId] });
    qc.invalidateQueries({ queryKey: ["health-upcoming"] });
  };
  const create = useMutation({ mutationFn: (v: Parameters<typeof healthApi.create>[1]) => healthApi.create(petId, v), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (eid: string) => healthApi.remove(eid), onSuccess: invalidate });
  const list = (events.data as Awaited<ReturnType<typeof healthApi.listForPet>> | undefined) ?? [];

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => (f.get(k) ? String(f.get(k)) : undefined);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : undefined);
    create.mutate({
      type: f.get("type") as HealthEventType, eventDate: str("eventDate"), label: str("label"),
      vetLabel: str("vetLabel"), nextDueDate: str("nextDueDate"), cost: num("cost"), weightKg: num("weightKg"),
    });
    e.currentTarget.reset();
  }

  return (
    <Panel title="Carnet de santé" hint="Vaccins, vermifuges, visites, pesées…">
      <form onSubmit={onAdd} className="mb-4 grid gap-2 rounded-card border border-line p-3 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Type
          <Select name="type" defaultValue="vaccin" options={HEALTH_TYPES.map((t) => ({ value: t, label: HEALTH_LABEL[t] }))} className="mt-1" />
        </label>
        <label className="text-xs text-muted-foreground">Date<DatePicker dense name="eventDate" defaultValue={today()} className="mt-1" /></label>
        <label className="text-xs text-muted-foreground">Rappel le<DatePicker dense name="nextDueDate" className="mt-1" /></label>
        <label className="text-xs text-muted-foreground">Libellé<input name="label" className={cn(field, "mt-1")} placeholder="Produit, motif…" /></label>
        <label className="text-xs text-muted-foreground">Vétérinaire<input name="vetLabel" className={cn(field, "mt-1")} /></label>
        <label className="text-xs text-muted-foreground">Poids (kg)<input type="number" step="0.01" min="0" name="weightKg" className={cn(field, "mt-1")} /></label>
        <div className="sm:col-span-3"><MiniBtn label="Ajouter au carnet" icon="check" tone="green" /></div>
      </form>

      {events.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun événement de santé pour {petName}.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-field border border-line px-3 py-2 text-sm">
              <span className="mono text-[12px] text-muted-foreground">{fmt(h.eventDate)}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{HEALTH_LABEL[h.type]}</span>
              {h.label && <span className="font-medium">{h.label}</span>}
              {h.weightKg != null && <span className="text-muted-foreground">{h.weightKg} kg</span>}
              {h.vetLabel && <span className="text-muted-foreground">· {h.vetLabel}</span>}
              {h.nextDueDate && <span className="text-lavande-700">· rappel {fmt(h.nextDueDate)}</span>}
              <button type="button" onClick={() => remove.mutate(h.id)} disabled={remove.isPending} className="ml-auto text-xs text-brick-600 hover:underline">Supprimer</button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------------- registre --------------------------------- */
function RegistreSection({ petId, reg, qc }: {
  petId: string; reg: { intakeDate: string | null; intakeOrigin: IntakeOrigin | null; icadNumber: string | null; outcomeDate: string | null; outcomeType: OutcomeType | null; status: string } | undefined;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const inv = () => { qc.invalidateQueries({ queryKey: ["registre"] }); qc.invalidateQueries({ queryKey: ["registre-stats"] }); };
  const intake = useMutation({ mutationFn: (v: { date?: string; origin?: IntakeOrigin; icadNumber?: string }) => registreApi.setIntake(petId, v), onSuccess: inv });
  const outcome = useMutation({ mutationFn: (v: { date?: string; type?: OutcomeType }) => registreApi.setOutcome(petId, v), onSuccess: inv });

  function onIntake(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    intake.mutate({ date: String(f.get("date") || "") || undefined, origin: (f.get("origin") as IntakeOrigin) || undefined, icadNumber: String(f.get("icad") || "") || undefined });
  }
  function onOutcome(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    outcome.mutate({ date: String(f.get("date") || "") || undefined, type: (f.get("type") as OutcomeType) || undefined });
  }

  return (
    <Panel title="Registre légal" hint="Entrée / sortie · obligation réglementaire">
      <form onSubmit={onIntake} className="grid gap-2">
        <div className="mono text-[11px] uppercase tracking-wide text-muted-foreground">Entrée</div>
        <DatePicker dense name="date" key={`in-${reg?.intakeDate ?? ""}`} defaultValue={reg?.intakeDate ?? ""} />
        <Select name="origin" defaultValue={reg?.intakeOrigin ?? ""} options={[{ value: "", label: "Provenance…" }, ...ORIGINS.map((o) => ({ value: o, label: ORIGIN[o] }))]} />
        <input name="icad" defaultValue={reg?.icadNumber ?? ""} placeholder="N° ICAD" className={field} />
        <div><MiniBtn label="Enregistrer l'entrée" icon="check" tone="green" /></div>
      </form>
      <form onSubmit={onOutcome} className="mt-4 grid gap-2 border-t border-line pt-4">
        <div className="mono text-[11px] uppercase tracking-wide text-muted-foreground">Sortie</div>
        <DatePicker dense name="date" key={`out-${reg?.outcomeDate ?? ""}`} defaultValue={reg?.outcomeDate ?? ""} />
        <Select name="type" defaultValue={reg?.outcomeType ?? ""} options={[{ value: "", label: "Motif de sortie…" }, ...OUTCOMES.map((o) => ({ value: o, label: OUTCOME[o] }))]} />
        <div><MiniBtn label="Enregistrer la sortie" icon="check" /></div>
      </form>
    </Panel>
  );
}

/* ------------------------------ candidatures -------------------------------- */
function CandidaturesSection({ apps, qc }: {
  apps: { id: string; status: string; motivation: string; housingType: string | null; createdAt: string }[];
  qc: ReturnType<typeof useQueryClient>;
}) {
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => shelterApi.updateApplication(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shelter-applications"] }),
  });
  return (
    <Panel title={`Candidatures (${apps.length})`} hint="Reçues pour cet animal"
      action={<Link to="/refuge/candidatures"><MiniBtn label="Tout voir" icon="arrow" /></Link>}>
      {apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune candidature reçue pour cet animal.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {apps.map((c) => (
            <div key={c.id} className="rounded-field border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Tag s={c.status} />
                <span className="mono text-[11px] uppercase text-muted-foreground">{c.housingType ?? "logement ?"} · {fmt(c.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-[1.5] text-foreground">{c.motivation}</p>
              <div className="mt-2 flex gap-2">
                {c.status === "envoyee" && <MiniBtn label="Entretien" icon="message" onClick={() => update.mutate({ id: c.id, status: "en_cours" })} disabled={update.isPending} />}
                {c.status !== "acceptee" && <MiniBtn label="Accepter" icon="check" tone="green" onClick={() => update.mutate({ id: c.id, status: "acceptee" })} disabled={update.isPending} />}
                {c.status !== "refusee" && <MiniBtn label="Refuser" icon="x" tone="brick" onClick={() => update.mutate({ id: c.id, status: "refusee" })} disabled={update.isPending} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ----------------------------- adoption / accueil --------------------------- */
function AdoptionSection({ apps, contracts, placement, qc }: {
  apps: { id: string; status: string }[];
  contracts: { id: string; reference: string; type: string; status: string }[];
  placement: { fam: { id: string; name: string | null }; pl: { id: string; petName: string } } | undefined;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const generate = useMutation({
    mutationFn: (applicationId: string) => contractsApi.createAdoption({ applicationId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shelter-contracts"] }),
  });
  const acceptedNoContract = apps.find((a) => a.status === "acceptee") && contracts.length === 0;

  return (
    <Panel title="Adoption & accueil" hint="Contrat et famille d'accueil">
      {contracts.length === 0 && !acceptedNoContract && !placement && (
        <p className="text-sm text-muted-foreground">Aucun contrat ni placement pour cet animal.</p>
      )}

      {acceptedNoContract && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-field border border-line px-3 py-2">
          <span className="text-sm">Candidature acceptée · prête à contractualiser</span>
          <MiniBtn label="Générer le contrat" icon="check" tone="green"
            onClick={() => { const a = apps.find((x) => x.status === "acceptee"); if (a) generate.mutate(a.id); }}
            disabled={generate.isPending} />
        </div>
      )}

      {contracts.map((c) => (
        <div key={c.id} className="mb-2 flex flex-wrap items-center gap-2.5 rounded-field border border-line px-3 py-2">
          <span className="mono text-[12px] font-semibold">{c.reference}</span>
          <span className="mono text-[11px] uppercase text-muted-foreground">{c.type === "adoption" ? "Adoption" : "Accueil"} · {c.status}</span>
          <div className="ml-auto flex items-center gap-2">
            <a href={`/refuge/contrats/${c.id}/document`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground">Document</a>
            <Link to="/refuge/contrats"><MiniBtn label="Gérer" icon="sliders" /></Link>
          </div>
        </div>
      ))}

      {placement && (
        <div className="mt-2 flex items-center gap-2 rounded-field bg-tint-coral px-3 py-2 text-[13.5px]">
          <Icon name="home" size={15} className="text-coral-600" />
          <span>En famille d'accueil chez <strong>{placement.fam.name ?? "une famille"}</strong></span>
          <Link to="/refuge/familles" className="ml-auto text-[13px] font-semibold text-coral-700 hover:underline">Voir</Link>
        </div>
      )}
    </Panel>
  );
}
