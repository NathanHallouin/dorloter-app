import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  volunteeringApi,
  type ShiftKind,
  type SignupStatus,
  type VolunteerStatus,
} from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn, field, Select } from "@/components/dash/kit";

const VOL_STATUS: Record<VolunteerStatus, string> = { candidate: "Candidat", active: "Actif", inactive: "Inactif" };
const KIND: Record<ShiftKind, string> = {
  permanence: "Permanence", promenade: "Promenade", nettoyage: "Nettoyage",
  accueil: "Accueil", transport: "Transport", autre: "Autre",
};
const KINDS = Object.keys(KIND) as ShiftKind[];
const SIGN: Record<SignupStatus, string> = { inscrit: "Inscrit", present: "Présent", absent: "Absent" };

const dt = (s: string) => new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function ShelterVolunteersPage() {
  const qc = useQueryClient();
  const [openShift, setOpenShift] = useState<string | null>(null);

  const volunteers = useQuery({ queryKey: ["volunteers"], queryFn: () => volunteeringApi.listVolunteers() });
  const shifts = useQuery({ queryKey: ["shifts"], queryFn: () => volunteeringApi.listShifts() });
  const signups = useQuery({
    queryKey: ["signups", openShift],
    queryFn: () => volunteeringApi.listSignups(openShift!),
    enabled: !!openShift,
  });

  const invVol = () => qc.invalidateQueries({ queryKey: ["volunteers"] });
  const invShifts = () => qc.invalidateQueries({ queryKey: ["shifts"] });
  const invSignups = () => qc.invalidateQueries({ queryKey: ["signups", openShift] });

  const createVol = useMutation({ mutationFn: volunteeringApi.createVolunteer, onSuccess: invVol });
  const delVol = useMutation({ mutationFn: (id: string) => volunteeringApi.removeVolunteer(id), onSuccess: invVol });
  const createShift = useMutation({ mutationFn: volunteeringApi.createShift, onSuccess: invShifts });
  const delShift = useMutation({ mutationFn: (id: string) => volunteeringApi.removeShift(id), onSuccess: invShifts });
  const signup = useMutation({ mutationFn: (v: { shiftId: string; volunteerId: string }) => volunteeringApi.signup(v.shiftId, v.volunteerId), onSuccess: invSignups });
  const updSignup = useMutation({ mutationFn: (v: { id: string; status?: SignupStatus; hours?: number }) => volunteeringApi.updateSignup(v.id, { status: v.status, hours: v.hours }), onSuccess: invSignups });
  const delSignup = useMutation({ mutationFn: (id: string) => volunteeringApi.removeSignup(id), onSuccess: invSignups });

  const vols = volunteers.data ?? [];

  function onAddVol(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => (f.get(k) ? String(f.get(k)) : undefined);
    createVol.mutate({ name: String(f.get("name") ?? ""), email: s("email"), phone: s("phone"), skills: s("skills"), availability: s("availability"), status: (f.get("status") as VolunteerStatus) || "active" });
    e.currentTarget.reset();
  }
  function onAddShift(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => (f.get(k) ? String(f.get(k)) : undefined);
    const start = String(f.get("startsAt"));
    createShift.mutate({
      title: String(f.get("title") ?? ""),
      kind: (f.get("kind") as ShiftKind) || "permanence",
      startsAt: new Date(start).toISOString(),
      location: s("location"),
      capacity: f.get("capacity") ? Number(f.get("capacity")) : undefined,
    });
    e.currentTarget.reset();
  }

  const input = field;

  return (
    <div>
      <DashPageHead title="Bénévoles & planning" desc="Recrutez vos bénévoles, organisez les permanences, suivez les heures." />

      <Panel title="Bénévoles" hint={`${vols.length} bénévole(s)`}>
        <form onSubmit={onAddVol} className="mb-4 grid gap-2 rounded-card border border-line p-3 md:grid-cols-4">
          <input name="name" required placeholder="Nom" className={input} />
          <input name="email" type="email" placeholder="Email" className={input} />
          <input name="phone" placeholder="Téléphone" className={input} />
          <Select name="status" defaultValue="active" options={(Object.keys(VOL_STATUS) as VolunteerStatus[]).map((s) => ({ value: s, label: VOL_STATUS[s] }))} />
          <input name="skills" placeholder="Compétences" className={cn(input, "md:col-span-2")} />
          <input name="availability" placeholder="Disponibilités" className={cn(input, "md:col-span-2")} />
          <div className="md:col-span-4"><MiniBtn label="Ajouter le bénévole" icon="check" tone="green" /></div>
        </form>
        {volunteers.isError && <p className="text-brick-600">Accès refuge requis.</p>}
        <ul className="flex flex-col gap-2">
          {vols.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-field border border-line px-3 py-2 text-sm">
              <span className="font-semibold">{v.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{VOL_STATUS[v.status]}</span>
              {v.email && <span className="text-muted-foreground">{v.email}</span>}
              {v.skills && <span className="text-muted-foreground">· {v.skills}</span>}
              {v.availability && <span className="mono text-[11px] text-muted-foreground">· {v.availability}</span>}
              <button type="button" onClick={() => delVol.mutate(v.id)} className="ml-auto text-xs text-brick-600 hover:underline">Retirer</button>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mt-6">
        <Panel title="Planning des permanences" hint="Créneaux à venir et inscriptions">
          <form onSubmit={onAddShift} className="mb-4 grid gap-2 rounded-card border border-line p-3 md:grid-cols-5">
            <input name="title" required placeholder="Intitulé" className={cn(input, "md:col-span-2")} />
            <Select name="kind" defaultValue="permanence" options={KINDS.map((k) => ({ value: k, label: KIND[k] }))} />
            <input name="startsAt" type="datetime-local" required className={input} />
            <input name="capacity" type="number" min="1" placeholder="Places" className={input} />
            <input name="location" placeholder="Lieu" className={cn(input, "md:col-span-4")} />
            <div className="md:col-span-5"><MiniBtn label="Créer le créneau" icon="check" tone="green" /></div>
          </form>

          <div className="flex flex-col gap-2">
            {(shifts.data ?? []).map((s) => (
              <div key={s.id} className="rounded-card border border-line p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{s.title}</span>
                  <span className="rounded-full bg-tint-coral px-2 py-0.5 text-[11px] font-semibold text-coral-700">{KIND[s.kind]}</span>
                  <span className="mono text-[12px] text-muted-foreground">{dt(s.startsAt)}</span>
                  {s.location && <span className="text-muted-foreground">· {s.location}</span>}
                  {s.capacity != null && <span className="text-muted-foreground">· {s.capacity} places</span>}
                  <div className="ml-auto flex gap-2">
                    <MiniBtn label={openShift === s.id ? "Masquer" : "Inscriptions"} icon="user" onClick={() => setOpenShift(openShift === s.id ? null : s.id)} />
                    <button type="button" onClick={() => delShift.mutate(s.id)} className="text-xs text-brick-600 hover:underline">Supprimer</button>
                  </div>
                </div>
                {openShift === s.id && (
                  <div className="mt-3 border-t border-line pt-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Select id={`vol-${s.id}`} placeholder="Inscrire un bénévole…" options={vols.map((v) => ({ value: v.id, label: v.name }))} />
                      <MiniBtn label="Inscrire" icon="check" onClick={() => {
                        const sel = document.getElementById(`vol-${s.id}`) as HTMLSelectElement | null;
                        if (sel?.value) signup.mutate({ shiftId: s.id, volunteerId: sel.value });
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
                            {su.hours != null && <span className="text-muted-foreground">{su.hours} h</span>}
                            <div className="ml-auto flex items-center gap-2">
                              {su.status !== "present" && <button type="button" onClick={() => updSignup.mutate({ id: su.id, status: "present", hours: su.hours ?? 2 })} className="text-xs text-coral-700 hover:underline">Présent</button>}
                              {su.status !== "absent" && <button type="button" onClick={() => updSignup.mutate({ id: su.id, status: "absent" })} className="text-xs text-muted-foreground hover:underline">Absent</button>}
                              <button type="button" onClick={() => delSignup.mutate(su.id)} className="text-xs text-brick-600 hover:underline">Retirer</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
