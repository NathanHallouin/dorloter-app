import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { followupsApi, type AdoptionFollowup } from "@dorloter/client";
import { cn, Icon } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn, field } from "@/components/dash/kit";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const SPECIES: Record<string, string> = { chat: "Chat", chien: "Chien" };

export function ShelterFollowupsPage() {
  const qc = useQueryClient();
  const followups = useQuery({ queryKey: ["shelter-followups"], queryFn: () => followupsApi.list() });
  const inv = () => qc.invalidateQueries({ queryKey: ["shelter-followups"] });

  const complete = useMutation({
    mutationFn: (v: { id: string; notes?: string }) => followupsApi.complete(v.id, v.notes),
    onSuccess: inv,
  });
  const reopen = useMutation({ mutationFn: (id: string) => followupsApi.reopen(id), onSuccess: inv });
  const cancel = useMutation({ mutationFn: (id: string) => followupsApi.cancel(id), onSuccess: inv });

  const list = followups.data ?? [];
  const todo = list.filter((f) => f.status === "a_faire");
  const done = list.filter((f) => f.status === "fait");
  const overdueCount = todo.filter((f) => f.overdue).length;

  return (
    <div>
      <DashPageHead
        title="Suivi post-adoption"
        desc="Après chaque adoption signée, prenez des nouvelles de l'animal à 1 semaine, 1 mois et 3 mois. Un lien de confiance qui rassure l'adoptant et protège l'animal."
      />

      {followups.isError && <p className="text-brick-600">Accès refuge requis.</p>}

      {!followups.isLoading && list.length === 0 && (
        <div className="rounded-card border border-dashed border-line px-6 py-[60px] text-center text-muted-foreground">
          <span className="inline-flex text-sable-300"><Icon name="bell" size={40} /></span>
          <p className="mt-3 font-semibold text-foreground">Aucun suivi pour l'instant</p>
          <p className="mt-1 text-[14px]">Les relances apparaîtront ici automatiquement dès qu'un contrat d'adoption est signé.</p>
        </div>
      )}

      {todo.length > 0 && (
        <Panel
          title="À faire"
          hint={overdueCount > 0 ? `${overdueCount} en retard` : `${todo.length} relance${todo.length > 1 ? "s" : ""} à venir`}
          pad={false}
        >
          <div className="flex flex-col divide-y divide-line">
            {todo.map((f) => (
              <FollowupRow key={f.id} f={f} onComplete={(notes) => complete.mutate({ id: f.id, notes })} onCancel={() => cancel.mutate(f.id)} busy={complete.isPending} />
            ))}
          </div>
        </Panel>
      )}

      {done.length > 0 && (
        <div className="mt-5">
          <Panel title="Historique" hint={`${done.length} relance${done.length > 1 ? "s" : ""} faite${done.length > 1 ? "s" : ""}`} pad={false}>
            <div className="flex flex-col divide-y divide-line">
              {done.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="text-coral-600"><Icon name="check" size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground">{f.label} · {f.adopterName ?? "Adoptant"}</div>
                    <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                      {f.petName ?? "Animal"}{f.completedAt ? ` · fait le ${fmtDate(f.completedAt)}` : ""}
                    </div>
                    {f.notes && <p className="mt-1 text-[13px] italic text-muted-foreground">« {f.notes} »</p>}
                  </div>
                  <MiniBtn label="Rouvrir" icon="rotate" onClick={() => reopen.mutate(f.id)} disabled={reopen.isPending} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function FollowupRow({
  f,
  onComplete,
  onCancel,
  busy,
}: {
  f: AdoptionFollowup;
  onComplete: (notes?: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className={cn("px-4 py-3.5", f.overdue && "bg-brick-50/60")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("grid h-9 w-9 flex-none place-items-center rounded-full", f.overdue ? "bg-brick-100 text-brick-600" : "bg-coral-50 text-coral-600")}>
          <Icon name="bell" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">{f.label}</span>
            {f.overdue ? (
              <span className="rounded-full bg-brick-600 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">En retard</span>
            ) : (
              <span className="mono text-[11px] text-muted-foreground">échéance {fmtDate(f.dueDate)}</span>
            )}
          </div>
          <div className="mono mt-0.5 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
            {f.adopterName ?? "Adoptant"} · {f.petName ?? "Animal"}{f.species ? ` (${SPECIES[f.species] ?? f.species})` : ""} · contrat {f.contractReference}
          </div>
        </div>
        <div className="flex flex-none flex-wrap items-center gap-1.5">
          {f.adopterPhone && (
            <a href={`tel:${f.adopterPhone}`} title={f.adopterPhone}><MiniBtn label="Appeler" icon="phone" /></a>
          )}
          {f.adopterEmail && (
            <a href={`mailto:${f.adopterEmail}?subject=${encodeURIComponent(`Des nouvelles de ${f.petName ?? "votre compagnon"} ?`)}`}><MiniBtn label="Email" icon="mail" /></a>
          )}
          <MiniBtn label="Marquer fait" icon="check" tone="green" onClick={() => setOpen((o) => !o)} />
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Note de suivi (optionnel) · ex. « Tout va bien, l'animal s'est bien adapté »"
            className={cn(field, "resize-y")}
          />
          <div className="mt-2 flex items-center gap-2">
            <MiniBtn label="Confirmer" icon="check" tone="green" onClick={() => { onComplete(note.trim() || undefined); setOpen(false); }} disabled={busy} />
            <button type="button" onClick={() => setOpen(false)} className="text-[12.5px] text-muted-foreground hover:text-foreground">Annuler</button>
            <button type="button" onClick={onCancel} className="ml-auto text-[12px] text-brick-600 hover:underline">Ne pas suivre</button>
          </div>
        </div>
      )}
    </div>
  );
}
