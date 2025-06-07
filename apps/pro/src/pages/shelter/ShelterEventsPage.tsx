import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi, volunteeringApi, type EventType } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn } from "@/components/dash/kit";

const TYPE: Record<EventType, string> = {
  collecte: "Collecte", journee_adoption: "Journée d'adoption", porte_ouverte: "Porte ouverte",
  marche: "Marché", sensibilisation: "Sensibilisation", autre: "Autre",
};
const TYPES = Object.keys(TYPE) as EventType[];
const SIGN: Record<string, string> = { inscrit: "Inscrit", present: "Présent", absent: "Absent" };
const dt = (s: string) => new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function ShelterEventsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);

  const events = useQuery({ queryKey: ["events"], queryFn: () => eventsApi.list() });
  const volunteers = useQuery({ queryKey: ["volunteers"], queryFn: () => volunteeringApi.listVolunteers() });
  const signups = useQuery({ queryKey: ["event-signups", open], queryFn: () => eventsApi.listSignups(open!), enabled: !!open });

  const invEvents = () => qc.invalidateQueries({ queryKey: ["events"] });
  const invSignups = () => qc.invalidateQueries({ queryKey: ["event-signups", open] });
  const create = useMutation({ mutationFn: eventsApi.create, onSuccess: invEvents });
  const del = useMutation({ mutationFn: (id: string) => eventsApi.remove(id), onSuccess: invEvents });
  const update = useMutation({ mutationFn: (v: { id: string; resultAmount?: number; resultNotes?: string }) => eventsApi.update(v.id, { resultAmount: v.resultAmount, resultNotes: v.resultNotes }), onSuccess: invEvents });
  const signup = useMutation({ mutationFn: (v: { eventId: string; volunteerId: string }) => eventsApi.signup(v.eventId, v.volunteerId), onSuccess: invSignups });
  const updSignup = useMutation({ mutationFn: (v: { id: string; status: string }) => eventsApi.updateSignup(v.id, v.status), onSuccess: invSignups });
  const delSignup = useMutation({ mutationFn: (id: string) => eventsApi.removeSignup(id), onSuccess: invSignups });

  const vols = volunteers.data ?? [];
  const input = "rounded-field border border-line bg-background px-2 py-1.5 text-sm";

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => (f.get(k) ? String(f.get(k)) : undefined);
    create.mutate({
      title: String(f.get("title") ?? ""),
      type: (f.get("type") as EventType) || "collecte",
      startsAt: new Date(String(f.get("startsAt"))).toISOString(),
      location: s("location"),
      capacity: f.get("capacity") ? Number(f.get("capacity")) : undefined,
      isPublic: f.get("isPublic") === "on",
      needs: s("needs"),
    });
    e.currentTarget.reset();
  }

  function onResult(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update.mutate({ id, resultAmount: f.get("resultAmount") ? Number(f.get("resultAmount")) : undefined, resultNotes: f.get("resultNotes") ? String(f.get("resultNotes")) : undefined });
  }

  return (
    <div>
      <DashPageHead title="Événements & opérations" desc="Collectes, journées d'adoption, portes ouvertes : organisez, mobilisez les bénévoles, faites le bilan." />

      <Panel title="Nouvel événement">
        <form onSubmit={onAdd} className="grid gap-2 md:grid-cols-4">
          <input name="title" required placeholder="Intitulé" className={cn(input, "md:col-span-2")} />
          <select name="type" defaultValue="collecte" className={input}>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE[t]}</option>)}
          </select>
          <input name="startsAt" type="datetime-local" required className={input} />
          <input name="location" placeholder="Lieu (ex. Carrefour Lyon 7)" className={cn(input, "md:col-span-2")} />
          <input name="capacity" type="number" min="1" placeholder="Bénévoles attendus" className={input} />
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" name="isPublic" /> Visible sur le site public</label>
          <input name="needs" placeholder="Besoins (croquettes, litière, bénévoles…)" className={cn(input, "md:col-span-3")} />
          <div className="md:col-span-4"><MiniBtn label="Créer l'événement" icon="check" tone="green" /></div>
        </form>
      </Panel>

      {events.isError && <p className="mt-4 text-brick-600">Accès refuge requis.</p>}

      <div className="mt-6 flex flex-col gap-3">
        {(events.data ?? []).map((ev) => (
          <div key={ev.id} className="rounded-card border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{ev.title}</span>
              <span className="rounded-full bg-tint-coral px-2 py-0.5 text-[11px] font-semibold text-coral-700">{TYPE[ev.type]}</span>
              <span className="mono text-[12px] text-muted-foreground">{dt(ev.startsAt)}</span>
              {ev.location && <span className="text-muted-foreground">· {ev.location}</span>}
              {ev.isPublic && <span className="rounded-full bg-tint-lavande px-2 py-0.5 text-[11px] font-semibold text-lavande-700">Public</span>}
              {ev.resultAmount != null && <span className="text-coral-700">· bilan {ev.resultAmount} €</span>}
              <div className="ml-auto flex gap-2">
                <MiniBtn label={open === ev.id ? "Masquer" : "Gérer"} icon="sliders" onClick={() => setOpen(open === ev.id ? null : ev.id)} />
                <button type="button" onClick={() => del.mutate(ev.id)} className="text-xs text-brick-600 hover:underline">Supprimer</button>
              </div>
            </div>
            {ev.needs && <p className="mt-1 text-[13px] text-muted-foreground">Besoins : {ev.needs}</p>}

            {open === ev.id && (
              <div className="mt-3 grid gap-4 border-t border-line pt-3 md:grid-cols-2">
                <div>
                  <div className="mono mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Bénévoles inscrits</div>
                  <div className="mb-2 flex items-center gap-2">
                    <select id={`ev-vol-${ev.id}`} className={input} defaultValue="">
                      <option value="">Inscrire un bénévole…</option>
                      {vols.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <MiniBtn label="Inscrire" icon="check" onClick={() => {
                      const sel = document.getElementById(`ev-vol-${ev.id}`) as HTMLSelectElement | null;
                      if (sel?.value) signup.mutate({ eventId: ev.id, volunteerId: sel.value });
                    }} disabled={signup.isPending} />
                  </div>
                  {(signups.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune inscription.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {(signups.data ?? []).map((su) => (
                        <li key={su.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{su.volunteerName}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{SIGN[su.status]}</span>
                          <div className="ml-auto flex items-center gap-2">
                            {su.status !== "present" && <button type="button" onClick={() => updSignup.mutate({ id: su.id, status: "present" })} className="text-xs text-coral-700 hover:underline">Présent</button>}
                            <button type="button" onClick={() => delSignup.mutate(su.id)} className="text-xs text-brick-600 hover:underline">Retirer</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="mono mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Bilan (collecte)</div>
                  <form onSubmit={(e) => onResult(e, ev.id)} className="grid gap-2">
                    <input name="resultAmount" type="number" step="0.01" min="0" defaultValue={ev.resultAmount ?? ""} placeholder="Montant collecté (€)" className={input} />
                    <input name="resultNotes" defaultValue={ev.resultNotes ?? ""} placeholder="En nature (kg croquettes, matériel…)" className={input} />
                    <div><MiniBtn label="Enregistrer le bilan" icon="check" tone="green" /></div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
