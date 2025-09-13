import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi, type ShelterApplication } from "@dorloter/client";
import { cn, Icon, Pill } from "@dorloter/ui";
import { Tag, MiniBtn, DashPageHead, Avatar } from "@/components/dash/kit";

const FILTERS = [
  { v: "tous", label: "Toutes" },
  { v: "envoyee", label: "À traiter" },
  { v: "en_cours", label: "Entretien" },
  { v: "acceptee", label: "Acceptées" },
  { v: "refusee", label: "Refusées" },
] as const;

const HOUSING: Record<string, string> = { appartement: "Appartement", maison: "Maison", autre: "Autre" };
const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export function ShelterCandidaturesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("tous");
  const [search, setSearch] = useState("");

  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });

  const update = useMutation({
    mutationFn: (v: { id: string; status: string; shelterNotes?: string }) =>
      shelterApi.updateApplication(v.id, v.status, v.shelterNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shelter-applications"] }),
  });

  const all = apps.data ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: all.length };
    for (const a of all) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [all]);

  const q = search.trim().toLowerCase();
  const list = all
    .filter((c) => filter === "tous" || c.status === filter)
    .filter((c) => !q
      || (c.applicantName ?? "").toLowerCase().includes(q)
      || (c.petName ?? "").toLowerCase().includes(q)
      || c.motivation.toLowerCase().includes(q));

  return (
    <div>
      <DashPageHead title="Candidatures" desc="Étudiez les dossiers, contactez les adoptants, passez en entretien, puis acceptez ou refusez." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ v, label }) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn(
                "inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[8px] border px-[13px] text-[13px] font-semibold transition-colors",
                filter === v ? "border-coral-600 bg-coral-600 text-sable-50" : "border-line bg-card text-muted-foreground hover:border-sable-400",
              )}>
              {label}
              {(counts[v] ?? 0) > 0 && (
                <span className={cn("font-mono tabular grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold",
                  filter === v ? "bg-sable-50/25 text-sable-50" : "bg-muted text-muted-foreground")}>
                  {counts[v]}
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="relative ml-auto">
          <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (adoptant, animal…)"
            className="h-[34px] w-[230px] rounded-[8px] border border-line bg-card pl-9 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-sable-400 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/15" />
        </label>
      </div>

      {apps.isError && <p className="text-brick-600">Accès refuge requis.</p>}
      {apps.isLoading && <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-card border border-line bg-card" />)}</div>}
      {!apps.isLoading && list.length === 0 && (
        <div className="grid place-items-center rounded-card border border-dashed border-line py-16 text-center">
          <Icon name="inbox" size={26} className="text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">{q ? "Aucune candidature ne correspond à la recherche." : "Aucune candidature dans cette catégorie."}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {list.map((c) => (
          <Card key={c.id} c={c}
            onStatus={(status) => update.mutate({ id: c.id, status })}
            onNotes={(notes) => update.mutate({ id: c.id, status: c.status, shelterNotes: notes })}
            pending={update.isPending} />
        ))}
      </div>
    </div>
  );
}

function Card({ c, onStatus, onNotes, pending }: {
  c: ShelterApplication;
  onStatus: (status: string) => void;
  onNotes: (notes: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmRefuse, setConfirmRefuse] = useState(false);
  const [notes, setNotes] = useState(c.shelterNotes ?? "");

  const facts: string[] = [];
  if (c.housingType) facts.push(HOUSING[c.housingType] ?? c.housingType);
  if (c.hasOutdoorAccess) facts.push("Jardin / extérieur");
  if (c.hasChildren) facts.push(c.childrenAges ? `Enfants · ${c.childrenAges}` : "Avec enfants");
  if (c.hasOtherPets) facts.push("Autres animaux");

  return (
    <div className="rounded-card border border-line bg-card p-4">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={c.applicantName ?? "?"} size={48} />

        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-[9px]">
            <span className="text-[16px] font-semibold text-foreground">{c.applicantName ?? "Adoptant"}</span>
            <Tag s={c.status} />
          </div>
          <div className="mono mt-[5px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
            <span>Pour</span>
            <Link to={`/refuge/animaux/${c.petId}`} className="font-semibold text-foreground hover:text-coral-700">
              {c.petName ?? "l'animal"}
            </Link>
            <span>· reçue le {fmt(c.createdAt)}</span>
          </div>

          {/* Coordonnées : action clé pour le refuge */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {c.applicantEmail && (
              <a href={`mailto:${c.applicantEmail}`} className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2 py-1 text-[12px] text-foreground hover:border-coral-300 hover:text-coral-700">
                <Icon name="mail" size={13} /> {c.applicantEmail}
              </a>
            )}
            {c.applicantPhone && (
              <a href={`tel:${c.applicantPhone}`} className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2 py-1 text-[12px] text-foreground hover:border-coral-300 hover:text-coral-700">
                <Icon name="phone" size={13} /> {c.applicantPhone}
              </a>
            )}
            {!c.applicantEmail && !c.applicantPhone && (
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground">Coordonnées non renseignées</span>
            )}
          </div>

          {facts.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {facts.map((f) => <Pill key={f} tone="sable">{f}</Pill>)}
            </div>
          )}

          <p className={cn("mt-2.5 text-[14px] leading-[1.5] text-foreground", !open && "line-clamp-2")}>{c.motivation}</p>

          <button onClick={() => setOpen((o) => !o)} className="mono mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-coral-700 hover:underline">
            <Icon name="chevron" size={13} className={cn("transition-transform", open ? "-rotate-90" : "rotate-90")} />
            {open ? "Masquer le dossier" : "Voir le dossier complet"}
          </button>
        </div>

        {/* Actions selon le statut */}
        <div className="flex flex-col items-end gap-2">
          {c.status === "envoyee" && <MiniBtn label="Entretien" icon="message" onClick={() => onStatus("en_cours")} disabled={pending} />}
          {(c.status === "envoyee" || c.status === "en_cours") && <MiniBtn label="Accepter" icon="check" tone="green" onClick={() => onStatus("acceptee")} disabled={pending} />}
          {c.status === "acceptee" && (
            <Link to="/refuge/contrats"><MiniBtn label="Créer le contrat" icon="shieldCheck" tone="green" /></Link>
          )}
          {c.status === "refusee" && <MiniBtn label="Réétudier" icon="rotate" onClick={() => onStatus("en_cours")} disabled={pending} />}
          {c.status === "annulee" && <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground">Annulée</span>}

          {c.status !== "refusee" && c.status !== "annulee" && (
            confirmRefuse ? (
              <div className="flex items-center gap-1.5">
                <MiniBtn label="Confirmer" icon="x" tone="brick" onClick={() => { onStatus("refusee"); setConfirmRefuse(false); }} disabled={pending} />
                <MiniBtn label="Annuler" onClick={() => setConfirmRefuse(false)} />
              </div>
            ) : (
              <MiniBtn label="Refuser" icon="x" tone="brick" onClick={() => setConfirmRefuse(true)} disabled={pending} />
            )
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            <Detail label="Logement" value={c.housingType ? (HOUSING[c.housingType] ?? c.housingType) : null} />
            <Detail label="Accès extérieur" value={c.hasOutdoorAccess == null ? null : c.hasOutdoorAccess ? "Oui" : "Non"} />
            <Detail label="Enfants au foyer" value={c.hasChildren == null ? null : c.hasChildren ? `Oui${c.childrenAges ? ` (${c.childrenAges})` : ""}` : "Non"} />
            <Detail label="Autres animaux" value={c.hasOtherPets} />
            <Detail label="Expérience" value={c.experience} full />
            <Detail label="Disponibilités" value={c.availability} full />
            <Detail label="Motivation" value={c.motivation} full />
          </div>

          <div className="mt-4">
            <label className="mono mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Notes internes (privées)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Compte-rendu d'entretien, points de vigilance…"
              className="w-full rounded-field border border-line bg-background px-3 py-2 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/15" />
            <div className="mt-2">
              <MiniBtn label="Enregistrer la note" icon="check" onClick={() => onNotes(notes)} disabled={pending || notes === (c.shelterNotes ?? "")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value?: ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[14px] leading-[1.5] text-foreground">{value ? value : <span className="text-muted-foreground">Non renseigné</span>}</div>
    </div>
  );
}
