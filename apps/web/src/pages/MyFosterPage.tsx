import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myFosterApi } from "@dorloter/client";
import { sheltersApi } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import type { FosterStatus, MyFostership } from "@dorloter/client";
import { PageHead, PageBody, EmptyState, Field, Input, Select, Textarea } from "@dorloter/ui";
import { Btn, Pill } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";

const STATUS_LABEL: Record<FosterStatus, string> = {
  invited: "Invitation reçue", requested: "Demande envoyée", active: "Active", declined: "Refusée", ended: "Terminée",
};
const STATUS_TONE: Record<FosterStatus, string> = {
  invited: "coral", requested: "lavande", active: "green", declined: "sable", ended: "sable",
};

export function MyFosterPage() {
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ shelterId: "", city: "", capacity: 1, acceptsCats: true, acceptsDogs: true, notes: "" });

  const ships = useQuery({ queryKey: ["my-fosterships"], queryFn: () => myFosterApi.list() });
  const shelters = useQuery({ queryKey: ["shelters-all"], queryFn: () => sheltersApi.list({}).then((r) => r.data) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-fosterships"] });
  const onErr = (e: unknown) => setError(e instanceof ApiClientError ? e.message : "Erreur.");

  const list = ships.data ?? [];
  const linkedIds = new Set(list.map((f) => f.shelterId));
  const availableShelters = (shelters.data ?? []).filter((s) => !linkedIds.has(s.id));

  const request = useMutation({
    mutationFn: () => myFosterApi.request(form.shelterId, { city: form.city, capacity: form.capacity, acceptsCats: form.acceptsCats, acceptsDogs: form.acceptsDogs, notes: form.notes }),
    onSuccess: () => { setApplying(false); setError(null); setForm({ shelterId: "", city: "", capacity: 1, acceptsCats: true, acceptsDogs: true, notes: "" }); invalidate(); },
    onError: onErr,
  });
  const respond = useMutation({ mutationFn: ({ id, accept }: { id: string; accept: boolean }) => myFosterApi.respondToInvitation(id, accept), onSuccess: invalidate, onError: onErr });

  return (
    <div>
      <PageHead crumb="Famille d'accueil" title="Famille d'accueil" sub="Hébergez temporairement un animal pour un refuge, le temps qu'il trouve son foyer."
        action={availableShelters.length > 0 ? <Btn icon={applying ? "x" : "plus"} variant={applying ? "outline" : "primary"} onClick={() => { setApplying((a) => !a); setError(null); }}>{applying ? "Fermer" : "Proposer mon aide"}</Btn> : undefined} />
      <PageBody width={820}>
        {applying && (
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); request.mutate(); }} className="mb-6 flex flex-col gap-4 rounded-card border border-line bg-card p-[22px]">
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <Field label="Refuge"><Select required value={form.shelterId} onChange={(e) => setForm({ ...form, shelterId: e.target.value })} options={[{ value: "", label: "Choisir un refuge…" }, ...availableShelters.map((s) => ({ value: s.id, label: s.name }))]} /></Field>
              <Field label="Ville"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lyon 6e" /></Field>
              <Field label="Nombre d'animaux possible"><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Toggle on={form.acceptsCats} icon="cat" label="Je peux accueillir des chats" onClick={() => setForm({ ...form, acceptsCats: !form.acceptsCats })} />
              <Toggle on={form.acceptsDogs} icon="dog" label="Je peux accueillir des chiens" onClick={() => setForm({ ...form, acceptsDogs: !form.acceptsDogs })} />
            </div>
            <Field label="Message au refuge (optionnel)"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Votre logement, votre expérience, vos disponibilités…" /></Field>
            {error && <p className="text-[13px] text-brick-600">{error}</p>}
            <div><Btn type="submit" icon="send" disabled={request.isPending || !form.shelterId}>{request.isPending ? "Envoi…" : "Envoyer ma demande"}</Btn></div>
          </form>
        )}
        {error && !applying && <p className="mb-3 text-[13px] text-brick-600">{error}</p>}

        {!ships.isLoading && list.length === 0 && !applying && (
          <EmptyState icon="home" title="Aucune relation famille d'accueil" text="Proposez votre aide à un refuge, ou attendez une invitation. Vos relations apparaîtront ici." />
        )}

        <div className="flex flex-col gap-3">
          {list.map((f) => <Ship key={f.id} f={f} onRespond={(accept) => respond.mutate({ id: f.id, accept })} pending={respond.isPending} />)}
        </div>
      </PageBody>
    </div>
  );
}

function Ship({ f, onRespond, pending }: { f: MyFostership; onRespond: (accept: boolean) => void; pending: boolean }) {
  return (
    <div className="rounded-[8px] border border-line bg-card p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {f.shelterSlug ? (
              <Link to={`/refuges/${f.shelterSlug}`} className="font-display text-[18px] font-semibold text-foreground">{f.shelterName ?? "Refuge"}</Link>
            ) : (
              <span className="font-display text-[18px] font-semibold text-foreground">{f.shelterName ?? "Refuge"}</span>
            )}
            <Pill tone={STATUS_TONE[f.status]}>{STATUS_LABEL[f.status]}</Pill>
          </div>
          <p className="mono mt-1 text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
            {f.source === "shelter" ? "Le refuge vous a invité" : "Vous avez fait la demande"} · {f.capacity} place{f.capacity > 1 ? "s" : ""}
          </p>
        </div>
        {f.status === "invited" && (
          <div className="flex flex-none gap-2">
            <Btn size="sm" icon="check" onClick={() => onRespond(true)} disabled={pending}>Accepter</Btn>
            <Btn size="sm" variant="outline" icon="x" onClick={() => onRespond(false)} disabled={pending}>Refuser</Btn>
          </div>
        )}
      </div>

      {f.status === "active" && (
        <div className="mt-3 border-t border-line pt-2.5">
          <div className="mono mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Animaux que vous accueillez</div>
          {f.placements.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Aucun animal pour le moment.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {f.placements.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 rounded-[6px] bg-tint-coral px-2.5 py-1 text-[13.5px] font-semibold text-foreground"><Icon name="paw" size={14} className="text-coral-600" /> {p.petName}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, icon, label, onClick }: { on: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={on
      ? "inline-flex items-center gap-2 rounded-full border border-coral-500 bg-tint-coral px-3.5 py-2 text-[13.5px] font-semibold text-coral-700"
      : "inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-[13.5px] font-semibold text-muted-foreground"}>
      <Icon name={on ? "check" : icon} size={15} /> {label}
    </button>
  );
}
