import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi } from "@dorloter/client";
import { useAuth } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { Btn, Pill } from "@dorloter/ui";
import { Field, Input, Select } from "@dorloter/ui";
import { DashPageHead, MiniBtn } from "@/components/dash/kit";

const ROLES = [
  { value: "owner", label: "Responsable" },
  { value: "gestionnaire", label: "Gestionnaire" },
  { value: "benevole", label: "Bénévole" },
];
const ROLE_LABEL: Record<string, string> = { owner: "Responsable", gestionnaire: "Gestionnaire", benevole: "Bénévole" };
const ROLE_TONE: Record<string, string> = { owner: "coral", gestionnaire: "lavande", benevole: "sable" };

export function ShelterTeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("benevole");
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });
  const members = query.data ?? [];
  const me = members.find((m) => m.userId === user?.id);
  const canManage = me?.role === "owner";
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shelter-members"] });

  const invite = useMutation({
    mutationFn: () => shelterApi.inviteMember(email, role),
    onSuccess: () => { setEmail(""); setError(null); invalidate(); },
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Invitation impossible."),
  });
  const changeRole = useMutation({ mutationFn: ({ id, r }: { id: string; r: string }) => shelterApi.updateMemberRole(id, r), onSuccess: invalidate, onError: (e) => setError(e instanceof ApiClientError ? e.message : "Erreur.") });
  const remove = useMutation({ mutationFn: (id: string) => shelterApi.removeMember(id), onSuccess: invalidate, onError: (e) => setError(e instanceof ApiClientError ? e.message : "Erreur.") });

  return (
    <div>
      <DashPageHead title="Équipe" desc="Les comptes qui ont accès à cet espace refuge, et leur rôle." />

      {query.isError && <p className="text-brick-600">Accès à un espace refuge requis.</p>}

      {canManage && (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); invite.mutate(); }} className="mb-[22px] flex flex-wrap items-end gap-3 rounded-card border border-line bg-card p-[22px]">
          <Field label="Inviter par e-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="benevole@exemple.fr" style={{ width: 280 }} /></Field>
          <Field label="Rôle"><Select value={role} onChange={(e) => setRole(e.target.value)} options={ROLES} style={{ width: 170 }} /></Field>
          <Btn type="submit" icon="plus" disabled={invite.isPending}>{invite.isPending ? "Invitation…" : "Inviter"}</Btn>
          {error && <p className="w-full text-[13px] text-brick-600">{error}</p>}
        </form>
      )}

      <div className="flex flex-col gap-2.5">
        {members.map((m) => {
          const isMe = m.userId === user?.id;
          return (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[8px] border border-line bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-[10px] bg-tint-coral font-display text-[18px] font-semibold text-coral-600">{(m.name ?? "?").charAt(0).toUpperCase()}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{m.name ?? "Membre"}</span>
                    {isMe && <span className="mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">(vous)</span>}
                  </div>
                  <div className="mono text-[11px] text-muted-foreground">{m.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canManage ? (
                  <Select value={m.role} onChange={(e) => changeRole.mutate({ id: m.id, r: e.target.value })} options={ROLES} style={{ width: 160, height: 40 }} />
                ) : (
                  <Pill tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</Pill>
                )}
                {canManage && <MiniBtn icon="trash" tone="brick" onClick={() => remove.mutate(m.id)} disabled={remove.isPending} />}
              </div>
            </div>
          );
        })}
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
