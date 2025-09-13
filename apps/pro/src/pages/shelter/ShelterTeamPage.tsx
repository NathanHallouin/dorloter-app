import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi, useAuth, ApiClientError, type ShelterTeamMember } from "@dorloter/client";
import { Btn, Pill, Field, Input } from "@dorloter/ui";
import { DashPageHead, MiniBtn, Stat, Select, Avatar } from "@/components/dash/kit";

const ROLES = [
  { value: "owner", label: "Responsable" },
  { value: "gestionnaire", label: "Gestionnaire" },
  { value: "benevole", label: "Bénévole" },
];
const ROLE_LABEL: Record<string, string> = { owner: "Responsable", gestionnaire: "Gestionnaire", benevole: "Bénévole" };
const ROLE_TONE: Record<string, string> = { owner: "coral", gestionnaire: "lavande", benevole: "sable" };
const ROLE_DESC: Record<string, string> = {
  owner: "Accès complet, y compris la gestion de l'équipe et la fiche du refuge.",
  gestionnaire: "Gère animaux, candidatures, contrats, planning et communication. Ne gère pas l'équipe.",
  benevole: "Consultation des dossiers et réponse aux messages.",
};

export function ShelterTeamPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("benevole");
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });
  const members = query.data ?? [];
  const me = members.find((m) => m.userId === user?.id);
  const canManage = me?.role === "owner";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  const counts = {
    total: members.length,
    owner: ownerCount,
    gestionnaire: members.filter((m) => m.role === "gestionnaire").length,
    benevole: members.filter((m) => m.role === "benevole").length,
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["shelter-members"] });
  const onErr = (e: unknown) => setError(e instanceof ApiClientError ? e.message : "Erreur.");

  const invite = useMutation({
    mutationFn: () => shelterApi.inviteMember(email, role),
    onSuccess: () => { setEmail(""); setError(null); invalidate(); },
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Invitation impossible."),
  });
  const changeRole = useMutation({ mutationFn: (v: { id: string; r: string }) => shelterApi.updateMemberRole(v.id, v.r), onSuccess: invalidate, onError: onErr });
  const remove = useMutation({ mutationFn: (id: string) => shelterApi.removeMember(id), onSuccess: invalidate, onError: onErr });
  const busy = changeRole.isPending || remove.isPending;

  return (
    <div>
      <DashPageHead title="Équipe" desc="Les comptes qui ont accès à cet espace refuge, et leur rôle." />

      {query.isError && <p className="text-brick-600">Accès à un espace refuge requis.</p>}

      {!query.isError && (
        <div className="dash-stats mb-6 grid grid-cols-4 gap-3.5">
          <Stat icon="users" label="Membres" value={String(counts.total)} />
          <Stat icon="shield" label="Responsables" value={String(counts.owner)} tone="coral" />
          <Stat icon="briefcase" label="Gestionnaires" value={String(counts.gestionnaire)} tone="lavande" />
          <Stat icon="star" label="Bénévoles" value={String(counts.benevole)} tone="prune" />
        </div>
      )}

      {canManage && (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); invite.mutate(); }} className="mb-5 flex flex-wrap items-end gap-3 rounded-card border border-line bg-card p-[22px]">
          <Field label="Inviter par e-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="benevole@exemple.fr" style={{ width: 280 }} /></Field>
          <Field label="Rôle"><Select value={role} onChange={setRole} options={ROLES} className="w-[180px]" /></Field>
          <Btn type="submit" icon="plus" disabled={invite.isPending}>{invite.isPending ? "Invitation…" : "Inviter"}</Btn>
          {error && <p className="w-full text-[13px] text-brick-600">{error}</p>}
        </form>
      )}

      {/* Légende des rôles */}
      <div className="mb-5 grid gap-2.5 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-card border border-line bg-card p-3.5">
            <Pill tone={ROLE_TONE[r.value]}>{r.label}</Pill>
            <p className="mt-2 text-[12.5px] leading-[1.45] text-muted-foreground">{ROLE_DESC[r.value]}</p>
          </div>
        ))}
      </div>

      {query.isLoading && (
        <div className="flex flex-col gap-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-[8px] border border-line bg-card" />)}</div>
      )}

      <div className="flex flex-col gap-2.5">
        {members.map((m) => (
          <MemberRow key={m.id} m={m} isMe={m.userId === user?.id} canManage={canManage}
            soleOwner={m.role === "owner" && ownerCount === 1} busy={busy}
            onRole={(r) => { setError(null); changeRole.mutate({ id: m.id, r }); }}
            onRemove={() => { setError(null); remove.mutate(m.id); }} />
        ))}
        {!query.isLoading && members.length === 0 && <p className="text-muted-foreground">Aucun membre.</p>}
      </div>

      {!canManage && members.length > 0 && (
        <p className="mono mt-4 text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
          Seul un responsable peut inviter ou modifier les membres.
        </p>
      )}
    </div>
  );
}

function MemberRow({ m, isMe, canManage, soleOwner, busy, onRole, onRemove }: {
  m: ShelterTeamMember;
  isMe: boolean;
  canManage: boolean;
  soleOwner: boolean;
  busy: boolean;
  onRole: (role: string) => void;
  onRemove: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const pending = m.status !== "active";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[8px] border border-line bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={m.name ?? "?"} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{m.name ?? "Membre"}</span>
            {isMe && <span className="mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">(vous)</span>}
            {pending && <Pill tone="lavande">Invitation en attente</Pill>}
          </div>
          {m.email
            ? <a href={`mailto:${m.email}`} className="mono text-[11px] text-muted-foreground hover:text-coral-700">{m.email}</a>
            : <div className="mono text-[11px] text-muted-foreground">Email non renseigné</div>}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {soleOwner && <span className="mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground" title="Le dernier responsable ne peut pas être rétrogradé ni retiré">Dernier responsable</span>}
        {canManage ? (
          <Select value={m.role} onChange={onRole} options={ROLES} disabled={soleOwner || busy} className="w-[170px]" />
        ) : (
          <Pill tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</Pill>
        )}
        {canManage && (
          confirm ? (
            <div className="flex items-center gap-1.5">
              <MiniBtn icon="trash" tone="brick" label="Retirer" onClick={() => { onRemove(); setConfirm(false); }} disabled={busy} />
              <MiniBtn label="Annuler" onClick={() => setConfirm(false)} />
            </div>
          ) : (
            <MiniBtn icon="trash" tone="brick" onClick={() => setConfirm(true)} disabled={soleOwner || busy} />
          )
        )}
      </div>
    </div>
  );
}
