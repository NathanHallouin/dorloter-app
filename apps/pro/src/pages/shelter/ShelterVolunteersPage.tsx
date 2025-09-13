import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  volunteeringApi, shelterApi, useAuth, ApiClientError,
  type VolunteerStatus, type Volunteer, type CreateVolunteerInput, type UpdateVolunteerInput,
} from "@dorloter/client";
import { cn, Icon, Pill, Btn, Field, Input, Textarea } from "@dorloter/ui";
import { DashPageHead, MiniBtn, Select, Avatar, Table, Td } from "@/components/dash/kit";

const VOL_STATUS: Record<VolunteerStatus, string> = { candidate: "Candidat", active: "Actif", inactive: "Inactif" };
const VOL_TONE: Record<VolunteerStatus, string> = { candidate: "lavande", active: "green", inactive: "sable" };
const STATUS_OPTS = (Object.keys(VOL_STATUS) as VolunteerStatus[]).map((s) => ({ value: s, label: VOL_STATUS[s] }));
const FILTERS: { v: string; label: string }[] = [
  { v: "tous", label: "Tous" }, { v: "active", label: "Actifs" }, { v: "candidate", label: "Candidats" }, { v: "inactive", label: "Inactifs" },
];
const skillTags = (s: string | null) => (s ?? "").split(/[,;]/).map((t) => t.trim()).filter(Boolean);

export function ShelterVolunteersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "new" | Volunteer>(null);

  const volunteers = useQuery({ queryKey: ["volunteers"], queryFn: () => volunteeringApi.listVolunteers() });
  const members = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });
  const myRole = members.data?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "gestionnaire";

  const invVol = () => qc.invalidateQueries({ queryKey: ["volunteers"] });
  const createVol = useMutation({ mutationFn: (input: CreateVolunteerInput) => volunteeringApi.createVolunteer(input), onSuccess: () => { setModal(null); invVol(); } });
  const updVol = useMutation({ mutationFn: (v: { id: string; input: UpdateVolunteerInput }) => volunteeringApi.updateVolunteer(v.id, v.input), onSuccess: () => { setModal(null); invVol(); } });
  const delVol = useMutation({ mutationFn: (id: string) => volunteeringApi.removeVolunteer(id), onSuccess: invVol });
  const busy = updVol.isPending || delVol.isPending;

  const all = volunteers.data ?? [];
  const counts: Record<string, number> = { tous: all.length, active: 0, candidate: 0, inactive: 0 };
  for (const v of all) counts[v.status] = (counts[v.status] ?? 0) + 1;

  const q = search.trim().toLowerCase();
  const list = all
    .filter((v) => filter === "tous" || v.status === filter)
    .filter((v) => !q || v.name.toLowerCase().includes(q) || (v.skills ?? "").toLowerCase().includes(q) || (v.email ?? "").toLowerCase().includes(q));

  return (
    <div>
      <DashPageHead title="Bénévoles" desc="Votre vivier de bénévoles : coordonnées, compétences et disponibilités. Les permanences se planifient dans l'Agenda."
        action={canManage ? <Btn icon="plus" onClick={() => setModal("new")}>Ajouter un bénévole</Btn> : undefined} />

      {volunteers.isError && <p className="mb-3 text-brick-600">Accès refuge requis.</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ v, label }) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn("inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[8px] border px-[13px] text-[13px] font-semibold transition-colors",
                filter === v ? "border-coral-600 bg-coral-600 text-sable-50" : "border-line bg-card text-muted-foreground hover:border-sable-400")}>
              {label}
              <span className={cn("font-mono tabular grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold",
                filter === v ? "bg-sable-50/25 text-sable-50" : "bg-muted text-muted-foreground")}>{counts[v] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto">
          <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, compétence…)"
            className="h-[34px] w-[230px] rounded-[8px] border border-line bg-card pl-9 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-sable-400 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/15" />
        </label>
      </div>

      {volunteers.isLoading ? (
        <div className="h-[200px] animate-pulse rounded-card border border-line bg-card" />
      ) : all.length === 0 ? (
        <div className="grid place-items-center rounded-card border border-dashed border-line py-16 text-center">
          <Icon name="star" size={26} className="text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Aucun bénévole pour l'instant.</p>
          {canManage && <Btn className="mt-3" size="sm" icon="plus" onClick={() => setModal("new")}>Ajouter un bénévole</Btn>}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-card border border-dashed border-line py-10 text-center text-muted-foreground">Aucun bénévole dans cette catégorie.</p>
      ) : (
        <div className="rounded-card border border-line bg-card p-1.5">
          <Table head={["Bénévole", "Coordonnées", "Compétences & disponibilités", "Statut", ""]}>
            {list.map((v) => (
              <VolunteerRow key={v.id} v={v} canManage={canManage} busy={busy}
                onEdit={() => setModal(v)}
                onStatus={(status) => updVol.mutate({ id: v.id, input: { status } })}
                onRemove={() => delVol.mutate(v.id)} />
            ))}
          </Table>
        </div>
      )}

      <p className="mono mt-4 text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
        Pour inscrire un bénévole à une permanence ou un événement, rendez-vous dans <Link to="/refuge/evenements" className="text-coral-700 hover:underline">l'Agenda</Link>.
      </p>

      {modal && canManage && (
        <VolunteerModal
          initial={modal === "new" ? null : modal}
          saving={createVol.isPending || updVol.isPending}
          error={createVol.error ?? updVol.error}
          onClose={() => setModal(null)}
          onSave={(input) => modal === "new" ? createVol.mutate(input) : updVol.mutate({ id: modal.id, input })} />
      )}
    </div>
  );
}

/* -------------------------------- table row -------------------------------- */
function VolunteerRow({ v, canManage, busy, onEdit, onStatus, onRemove }: {
  v: Volunteer; canManage: boolean; busy: boolean;
  onEdit: () => void; onStatus: (s: VolunteerStatus) => void; onRemove: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const tags = skillTags(v.skills);
  return (
    <tr className="group">
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={v.name} size={38} />
          <div className="min-w-0">
            <div className="font-semibold text-foreground">{v.name}</div>
            {v.notes && <div className="truncate text-[12px] text-muted-foreground" title={v.notes}>{v.notes}</div>}
          </div>
        </div>
      </Td>
      <Td>
        <div className="flex flex-col gap-0.5">
          {v.email && <a href={`mailto:${v.email}`} className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground hover:text-coral-700"><Icon name="mail" size={12} className="text-muted-foreground" /> {v.email}</a>}
          {v.phone && <a href={`tel:${v.phone}`} className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground hover:text-coral-700"><Icon name="phone" size={12} className="text-muted-foreground" /> {v.phone}</a>}
          {!v.email && !v.phone && <span className="text-[12.5px] text-muted-foreground">—</span>}
        </div>
      </Td>
      <Td>
        <div className="flex flex-wrap gap-1">
          {tags.length > 0 ? tags.map((t) => <Pill key={t} tone="sable">{t}</Pill>) : <span className="text-[12.5px] text-muted-foreground">—</span>}
        </div>
        {v.availability && <div className="mono mt-1 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">{v.availability}</div>}
      </Td>
      <Td>
        {canManage
          ? <Select value={v.status} onChange={(s) => onStatus(s as VolunteerStatus)} disabled={busy} options={STATUS_OPTS} className="w-[140px]" />
          : <Pill tone={VOL_TONE[v.status]}>{VOL_STATUS[v.status]}</Pill>}
      </Td>
      <Td right>
        {canManage && (
          confirm ? (
            <div className="inline-flex items-center gap-1.5">
              <MiniBtn icon="trash" tone="brick" label="Retirer" onClick={() => { onRemove(); setConfirm(false); }} disabled={busy} />
              <MiniBtn label="Annuler" onClick={() => setConfirm(false)} />
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              <MiniBtn icon="edit" label="Modifier" onClick={onEdit} />
              <MiniBtn icon="trash" tone="brick" onClick={() => setConfirm(true)} disabled={busy} />
            </div>
          )
        )}
      </Td>
    </tr>
  );
}

/* -------------------------------- create/edit ------------------------------ */
function VolunteerModal({ initial, saving, error, onClose, onSave }: {
  initial: Volunteer | null;
  saving: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (input: CreateVolunteerInput) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", status: initial?.status ?? "active",
    email: initial?.email ?? "", phone: initial?.phone ?? "",
    skills: initial?.skills ?? "", availability: initial?.availability ?? "", notes: initial?.notes ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const clean = (s: string) => (s.trim() === "" ? undefined : s.trim());

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(), status: form.status as VolunteerStatus,
      email: clean(form.email), phone: clean(form.phone),
      skills: clean(form.skills), availability: clean(form.availability), notes: clean(form.notes),
    });
  }
  const msg = error instanceof ApiClientError ? error.message : error ? "Enregistrement impossible." : null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(12,22,16,.45)] p-6 backdrop-blur-[3px] [animation:dlFade_.12s_ease]">
      <div onClick={(e) => e.stopPropagation()} className="w-[min(540px,100%)] rounded-[10px] border border-line bg-card p-[22px] shadow-[0_30px_80px_rgba(0,0,0,.4)] [animation:dlPop_.18s_ease]">
        <div className="flex items-center justify-between">
          <h3 className="text-[20px] font-semibold text-foreground">{initial ? "Modifier le bénévole" : "Nouveau bénévole"}</h3>
          <button onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-line bg-background text-muted-foreground"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={submit} className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <Field label="Nom"><Input required autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Marie Lambert" /></Field>
          <Field label="Statut"><Select value={form.status} onChange={(s) => set({ status: s as VolunteerStatus })} options={STATUS_OPTS} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="marie@exemple.fr" /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="06 12 34 56 78" /></Field>
          <div className="sm:col-span-2"><Field label="Compétences" hint="Séparez par des virgules (Promenade, Accueil, Transport…)"><Input value={form.skills} onChange={(e) => set({ skills: e.target.value })} placeholder="Promenade, accueil" /></Field></div>
          <div className="sm:col-span-2"><Field label="Disponibilités"><Input value={form.availability} onChange={(e) => set({ availability: e.target.value })} placeholder="Week-ends, mercredis après-midi" /></Field></div>
          <div className="sm:col-span-2"><Field label="Notes internes"><Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Permis B, allergique aux chats…" /></Field></div>
          {msg && <p className="text-[13px] text-brick-600 sm:col-span-2">{msg}</p>}
          <div className="flex justify-end gap-2.5 sm:col-span-2">
            <Btn variant="ghost" type="button" onClick={onClose}>Annuler</Btn>
            <Btn type="submit" icon="check" disabled={saving || !form.name.trim()}>{saving ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter"}</Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
