import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fosterApi, shelterApi, contractsApi, useAuth, ApiClientError } from "@dorloter/client";
import type { FosterFamily, Contract } from "@dorloter/client";
import { Btn, Pill, Icon, cn, Field, Input } from "@dorloter/ui";
import { DashPageHead, MiniBtn, Stat, Select } from "@/components/dash/kit";

const SOURCE_LABEL: Record<string, string> = { shelter: "Invitation", user: "Demande" };
const CONV_LABEL: Record<string, string> = { brouillon: "Brouillon", active: "Active", terminee: "Terminée", resilie: "Résiliée", annule: "Annulée" };

export function ShelterFostersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const families = useQuery({ queryKey: ["shelter-fosters"], queryFn: () => fosterApi.list() });
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const members = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });
  const contracts = useQuery({ queryKey: ["shelter-contracts"], queryFn: () => contractsApi.list() });

  const myRole = members.data?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "gestionnaire";

  const q = search.trim().toLowerCase();
  const all = (families.data ?? []).filter((f) => !q
    || (f.name ?? "").toLowerCase().includes(q)
    || (f.email ?? "").toLowerCase().includes(q)
    || (f.city ?? "").toLowerCase().includes(q));
  const requests = all.filter((f) => f.status === "requested");
  const invited = all.filter((f) => f.status === "invited");
  const active = all.filter((f) => f.status === "active");

  const allList = families.data ?? [];
  const placedIds = new Set(allList.flatMap((f) => f.placements.map((p) => p.petId)));
  const available = (pets.data ?? []).filter((p) => !placedIds.has(p.id) && p.status !== "adopte");
  const occupied = allList.reduce((n, f) => n + f.placements.length, 0);
  const capacity = allList.filter((f) => f.status === "active").reduce((n, f) => n + f.capacity, 0);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["shelter-fosters"] });
  const onErr = (e: unknown) => setError(e instanceof ApiClientError ? e.message : "Erreur.");

  const invite = useMutation({ mutationFn: () => fosterApi.invite(email), onSuccess: () => { setEmail(""); setShowInvite(false); setError(null); invalidate(); }, onError: onErr });
  const respond = useMutation({ mutationFn: ({ id, accept }: { id: string; accept: boolean }) => fosterApi.respondToRequest(id, accept), onSuccess: invalidate, onError: onErr });
  const end = useMutation({ mutationFn: (id: string) => fosterApi.end(id), onSuccess: invalidate, onError: onErr });
  const place = useMutation({ mutationFn: ({ familyId, petId }: { familyId: string; petId: string }) => fosterApi.placePet(familyId, petId), onSuccess: invalidate, onError: onErr });
  const endPlacement = useMutation({ mutationFn: (id: string) => fosterApi.endPlacement(id), onSuccess: invalidate, onError: onErr });
  const generateConv = useMutation({ mutationFn: (familyId: string) => contractsApi.createFoster({ fosterFamilyId: familyId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["shelter-contracts"] }), onError: onErr });

  const conventionFor = (f: FosterFamily): Contract | undefined => {
    const fc = (contracts.data ?? []).filter((c) => c.type === "foster" && c.fosterFamilyId === f.id);
    return fc.find((c) => c.status === "active" || c.status === "brouillon") ?? fc[0];
  };

  return (
    <div>
      <DashPageHead title="Familles d'accueil" desc="Les bénévoles qui hébergent vos animaux. Invitez un compte ou validez les demandes reçues."
        action={canManage ? <Btn icon="plus" onClick={() => { setShowInvite(true); setError(null); }}>Inviter une famille</Btn> : undefined} />

      {families.isError && <p className="text-brick-600">Accès à un espace refuge requis.</p>}

      {!families.isError && (
        <div className="dash-stats mb-6 grid grid-cols-4 gap-3.5">
          <Stat icon="home" label="Familles actives" value={String(active.length)} />
          <Stat icon="inbox" label="Demandes en attente" value={String(requests.length)} tone={requests.length > 0 ? "brick" : "coral"} sub={requests.length > 0 ? "à étudier" : "rien en attente"} />
          <Stat icon="send" label="Invitations envoyées" value={String(invited.length)} tone="lavande" />
          <Stat icon="paw" label="Places occupées" value={`${occupied}/${capacity}`} tone="prune" sub={capacity - occupied > 0 ? `${capacity - occupied} dispo` : "complet"} />
        </div>
      )}

      {!families.isError && (families.data ?? []).length > 0 && (
        <label className="relative mb-5 block max-w-[280px]">
          <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, email, ville…)"
            className="h-[36px] w-full rounded-[8px] border border-line bg-card pl-9 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-sable-400 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/15" />
        </label>
      )}

      {error && !showInvite && <p className="mb-3 text-[13px] text-brick-600">{error}</p>}

      {families.isLoading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-[210px] animate-pulse rounded-card border border-line bg-card" />)}
        </div>
      )}

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
      {!families.isLoading && (
        <Section title={`Familles actives (${active.length})`}>
          {active.length === 0 && <p className="text-[14px] text-muted-foreground">{q ? "Aucune famille ne correspond à la recherche." : "Aucune famille active pour le moment."}</p>}
          {active.map((f) => (
            <ActiveCard key={f.id} f={f} convention={conventionFor(f)} canManage={canManage} available={available}
              onPlace={(petId) => place.mutate({ familyId: f.id, petId })}
              onEndPlacement={(id) => endPlacement.mutate(id)}
              onEnd={() => end.mutate(f.id)}
              onGenerate={() => generateConv.mutate(f.id)}
              busy={place.isPending || endPlacement.isPending || end.isPending || generateConv.isPending} />
          ))}
        </Section>
      )}

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

/** Carte de base : identité, coordonnées actionnables, capacités, notes + slot. */
function Card({ f, children }: { f: FosterFamily; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-card p-[18px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-[10px] bg-tint-coral font-display text-[16px] font-semibold text-coral-600">{(f.name ?? "?").charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-[17px] font-semibold text-foreground">{f.name ?? "Compte"}</h3>
            <p className="mono truncate text-[10.5px] text-muted-foreground">{[f.city, `${f.capacity} place${f.capacity > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <Pill tone="sable">{SOURCE_LABEL[f.source]}</Pill>
      </div>

      {/* Coordonnées cliquables */}
      <div className="flex flex-wrap items-center gap-1.5">
        {f.email && (
          <a href={`mailto:${f.email}`} className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2 py-1 text-[12px] text-foreground hover:border-coral-300 hover:text-coral-700">
            <Icon name="mail" size={13} /> <span className="max-w-[190px] truncate">{f.email}</span>
          </a>
        )}
        {f.phone && (
          <a href={`tel:${f.phone}`} className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2 py-1 text-[12px] text-foreground hover:border-coral-300 hover:text-coral-700">
            <Icon name="phone" size={13} /> {f.phone}
          </a>
        )}
        {!f.email && !f.phone && <span className="mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">Coordonnées non renseignées</span>}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {f.acceptsCats && <Pill tone="sable" icon="cat">Chats</Pill>}
        {f.acceptsDogs && <Pill tone="sable" icon="dog">Chiens</Pill>}
      </div>
      {f.notes && <p className="text-[13px] leading-[1.5] text-foreground">{f.notes}</p>}
      {children}
    </div>
  );
}

function Occupancy({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.max(total, used) }).map((_, i) => (
        <span key={i} className={cn("h-2.5 w-2.5 rounded-full", i < used ? "bg-coral-600" : "bg-muted")} />
      ))}
    </div>
  );
}

function ActiveCard({ f, convention, canManage, available, onPlace, onEndPlacement, onEnd, onGenerate, busy }: {
  f: FosterFamily;
  convention?: Contract;
  canManage: boolean;
  available: { id: string; name: string; species: string }[];
  onPlace: (petId: string) => void;
  onEndPlacement: (id: string) => void;
  onEnd: () => void;
  onGenerate: () => void;
  busy: boolean;
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const full = f.placements.length >= f.capacity;

  return (
    <Card f={f}>
      {/* Animaux accueillis */}
      <div className="mt-1 border-t border-line pt-2.5">
        <div className="mono mb-2 flex items-center justify-between gap-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <span>Animaux accueillis ({f.placements.length}/{f.capacity})</span>
          <Occupancy used={f.placements.length} total={f.capacity} />
        </div>
        {f.placements.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Aucun animal placé.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {f.placements.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-[6px] bg-tint-coral px-2.5 py-1.5">
                <Link to={`/refuge/animaux/${p.petId}`} className="flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground hover:text-coral-700">
                  <Icon name="paw" size={14} className="text-coral-600" /> {p.petName}
                </Link>
                {canManage && <MiniBtn icon="rotate" label="Rendre" onClick={() => onEndPlacement(p.id)} disabled={busy} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Convention d'accueil */}
      <div className="border-t border-line pt-2.5">
        <div className="mono mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Convention d'accueil</div>
        {convention ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono text-[12px] font-semibold text-foreground">{convention.reference}</span>
            <Pill tone={convention.status === "active" ? "green" : "sable"}>{CONV_LABEL[convention.status] ?? convention.status}</Pill>
            <a href={`/refuge/contrats/${convention.id}/document`} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-muted-foreground hover:text-foreground">Document</a>
            <Link to="/refuge/contrats" className="text-[12px] font-semibold text-coral-700 hover:underline">Gérer</Link>
          </div>
        ) : canManage ? (
          <MiniBtn icon="shieldCheck" label="Générer la convention" onClick={onGenerate} disabled={busy} />
        ) : (
          <p className="text-[13px] text-muted-foreground">Aucune convention.</p>
        )}
      </div>

      {/* Actions de gestion */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
          {available.length > 0 && !full && (
            <Select value="" onChange={(v) => { if (v) onPlace(v); }} placeholder="Placer un animal…"
              options={available.map((p) => ({ value: p.id, label: `${p.name} (${p.species})` }))} className="max-w-[220px]" />
          )}
          {confirmEnd ? (
            <div className="flex items-center gap-1.5">
              <MiniBtn icon="x" tone="brick" label="Confirmer la fin" onClick={() => { onEnd(); setConfirmEnd(false); }} disabled={busy} />
              <MiniBtn label="Annuler" onClick={() => setConfirmEnd(false)} />
            </div>
          ) : (
            <MiniBtn icon="x" tone="brick" label="Mettre fin" onClick={() => setConfirmEnd(true)} disabled={busy} />
          )}
        </div>
      )}
    </Card>
  );
}
