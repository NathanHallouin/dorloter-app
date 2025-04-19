import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fosterApi } from "@/api/foster";
import { shelterApi } from "@/api/shelter";
import { useAuth } from "@/auth/AuthContext";
import { ApiClientError } from "@/api/client";
import type { FosterFamily } from "@/api/types";
import { Btn, Pill } from "@/ui/primitives";
import { Field, Input, Select } from "@/ui/forms";
import { Icon } from "@/ui/Icon";
import { DashPageHead, MiniBtn } from "@/components/dash/kit";

export function ShelterFostersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const families = useQuery({ queryKey: ["shelter-fosters"], queryFn: () => fosterApi.list() });
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const members = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });

  const myRole = members.data?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "gestionnaire";
  const list = families.data ?? [];
  const requests = list.filter((f) => f.status === "requested");
  const invited = list.filter((f) => f.status === "invited");
  const active = list.filter((f) => f.status === "active");

  const placedIds = new Set(list.flatMap((f) => f.placements.map((p) => p.petId)));
  const available = (pets.data ?? []).filter((p) => !placedIds.has(p.id) && p.status !== "adopte");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shelter-fosters"] });
  const onErr = (e: unknown) => setError(e instanceof ApiClientError ? e.message : "Erreur.");

  const invite = useMutation({ mutationFn: () => fosterApi.invite(email), onSuccess: () => { setEmail(""); setShowInvite(false); setError(null); invalidate(); }, onError: onErr });
  const respond = useMutation({ mutationFn: ({ id, accept }: { id: string; accept: boolean }) => fosterApi.respondToRequest(id, accept), onSuccess: invalidate, onError: onErr });
  const end = useMutation({ mutationFn: (id: string) => fosterApi.end(id), onSuccess: invalidate, onError: onErr });
  const place = useMutation({ mutationFn: ({ familyId, petId }: { familyId: string; petId: string }) => fosterApi.placePet(familyId, petId), onSuccess: invalidate, onError: onErr });
  const endPlacement = useMutation({ mutationFn: (id: string) => fosterApi.endPlacement(id), onSuccess: invalidate, onError: onErr });

  return (
    <div>
      <DashPageHead title="Familles d'accueil" desc="Les bénévoles qui hébergent vos animaux. Invitez un compte ou validez les demandes reçues."
        action={canManage ? <Btn icon="plus" onClick={() => { setShowInvite(true); setError(null); }}>Inviter une famille</Btn> : undefined} />

      {families.isError && <p className="text-brick-600">Accès à un espace refuge requis.</p>}
      {error && !showInvite && <p className="mb-3 text-[13px] text-brick-600">{error}</p>}

      {showInvite && canManage && (
        <div onClick={() => setShowInvite(false)} className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(12,22,16,.45)] p-6 backdrop-blur-[3px] [animation:dlFade_.12s_ease]">
          <div onClick={(e) => e.stopPropagation()} className="w-[min(460px,100%)] rounded-[10px] border border-line bg-card p-[22px] shadow-[0_30px_80px_rgba(0,0,0,.4)] [animation:dlPop_.18s_ease]">
            <div className="flex items-center justify-between">
              <h3 className="text-[20px] font-semibold text-foreground">Inviter une famille d'accueil</h3>
              <button onClick={() => setShowInvite(false)} aria-label="Fermer" className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-line bg-background text-muted-foreground"><Icon name="x" size={16} /></button>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-[1.5] text-muted-foreground">La personne doit déjà avoir un compte Dorloter. Elle recevra l'invitation dans son espace.</p>
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); invite.mutate(); }} className="mt-4 flex flex-col gap-3.5">
              <Field label="E-mail du compte"><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="famille@exemple.fr" /></Field>
              {error && <p className="text-[13px] text-brick-600">{error}</p>}
              <div className="flex justify-end gap-2.5">
                <Btn variant="ghost" type="button" onClick={() => setShowInvite(false)}>Annuler</Btn>
                <Btn type="submit" icon="send" disabled={invite.isPending}>{invite.isPending ? "Envoi…" : "Envoyer l'invitation"}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demandes reçues */}
      {requests.length > 0 && (
        <Section title={`Demandes reçues (${requests.length})`}>
          {requests.map((f) => (
            <Card key={f.id} f={f}>
              {canManage && (
                <div className="flex gap-2">
                  <Btn size="sm" icon="check" onClick={() => respond.mutate({ id: f.id, accept: true })} disabled={respond.isPending}>Accepter</Btn>
                  <Btn size="sm" variant="outline" icon="x" onClick={() => respond.mutate({ id: f.id, accept: false })} disabled={respond.isPending}>Refuser</Btn>
                </div>
              )}
            </Card>
          ))}
        </Section>
      )}

      {/* Familles actives */}
      <Section title={`Familles actives (${active.length})`}>
        {active.length === 0 && <p className="text-[14px] text-muted-foreground">Aucune famille active pour le moment.</p>}
        {active.map((f) => (
          <Card key={f.id} f={f}>
            <div className="mt-1 border-t border-line pt-2.5">
              <div className="mono mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Animaux accueillis ({f.placements.length}/{f.capacity})</div>
              {f.placements.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Aucun animal placé.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {f.placements.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-[6px] bg-tint-coral px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground"><Icon name="paw" size={14} className="text-coral-600" /> {p.petName}</span>
                      {canManage && <MiniBtn icon="check" label="Rendre" onClick={() => endPlacement.mutate(p.id)} disabled={endPlacement.isPending} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {canManage && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {available.length > 0 && f.placements.length < f.capacity && (
                  <Select value="" onChange={(e) => { if (e.target.value) place.mutate({ familyId: f.id, petId: e.target.value }); }}
                    options={[{ value: "", label: "Placer un animal…" }, ...available.map((p) => ({ value: p.id, label: `${p.name} (${p.species})` }))]} style={{ maxWidth: 220 }} />
                )}
                <MiniBtn icon="x" tone="brick" label="Mettre fin" onClick={() => end.mutate(f.id)} disabled={end.isPending} />
              </div>
            )}
          </Card>
        ))}
      </Section>

      {/* Invitations en attente */}
      {invited.length > 0 && (
        <Section title={`Invitations en attente (${invited.length})`}>
          {invited.map((f) => (
            <Card key={f.id} f={f}>
              <p className="mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">En attente de réponse de la personne.</p>
            </Card>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mono mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-coral-700">{title}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">{children}</div>
    </section>
  );
}

const SOURCE_LABEL: Record<string, string> = { shelter: "Invitation", user: "Demande" };

function Card({ f, children }: { f: FosterFamily; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-card p-[18px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[10px] bg-tint-coral font-display text-[16px] font-semibold text-coral-600">{(f.name ?? "?").charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-[17px] font-semibold text-foreground">{f.name ?? "Compte"}</h3>
              <p className="mono truncate text-[10.5px] text-muted-foreground">{f.email}</p>
            </div>
          </div>
        </div>
        <Pill tone="sable">{SOURCE_LABEL[f.source]}</Pill>
      </div>
      <p className="mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
        {[f.city, f.phone].filter(Boolean).join(" · ") || "Coordonnées non renseignées"} · {f.capacity} place{f.capacity > 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {f.acceptsCats && <Pill tone="sable" icon="cat">Chats</Pill>}
        {f.acceptsDogs && <Pill tone="sable" icon="dog">Chiens</Pill>}
      </div>
      {f.notes && <p className="text-[13px] leading-[1.5] text-foreground">{f.notes}</p>}
      {children}
    </div>
  );
}
