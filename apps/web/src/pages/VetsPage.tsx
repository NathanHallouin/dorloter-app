import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { vetsApi } from "@/api/vets";
import type { VetSummary } from "@/api/types";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { Eyebrow, Pill } from "@dorloter/ui";
import { EmptyState } from "@dorloter/ui";

function VetCard({ v }: { v: VetSummary }) {
  const species = [v.acceptsCats && "Chats", v.acceptsDogs && "Chiens", v.acceptsNac && "NAC"].filter(Boolean) as string[];
  return (
    <Link to={`/veterinaires/${v.slug}`} className="flex overflow-hidden rounded-[6px] border border-line bg-card">
      <div className="relative grid w-[150px] flex-none place-items-center bg-muted text-sable-300">
        {v.coverUrl ? <img src={v.coverUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="stethoscope" size={32} />}
        {v.emergencyAvailable && <span className="absolute left-2 top-2"><Pill tone="brick" icon="clock">24/7</Pill></span>}
      </div>
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-center gap-[7px]">
          <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">{v.name}</h3>
          <span className="inline-flex text-coral-600"><Icon name="badgeCheck" size={17} /></span>
        </div>
        {v.address && <div className="mono mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.05em] text-muted-foreground"><Icon name="pin" size={12} /> {v.address}</div>}
        <div className="mt-2.5 flex flex-wrap gap-1.5">{species.map((s) => <Pill key={s} tone="sable">{s}</Pill>)}</div>
        <div className="mt-3 flex justify-end">
          <span className="mono inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-coral-700">Voir la fiche <Icon name="arrow" size={13} /></span>
        </div>
      </div>
    </Link>
  );
}

export function VetsPage() {
  const [q, setQ] = useState("");
  const [emg, setEmg] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["vets", emg, q], queryFn: () => vetsApi.list({ emergency: emg || undefined, search: q || undefined }) });
  const vets = data?.data ?? [];

  return (
    <div>
      <div className="border-b border-line bg-card">
        <div className="mx-auto max-w-[1180px] px-8 py-7">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Link to="/" className="text-muted-foreground">Accueil</Link><Icon name="chevron" size={14} /><span className="font-semibold text-coral-700">Vétérinaires</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow>Carnet de santé</Eyebrow>
              <h1 className="mt-2 text-[38px] font-semibold tracking-[-0.01em] text-foreground">Vétérinaires de confiance</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">{vets.length} cabinets vérifiés · urgences, vaccination, identification</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={() => setEmg((e) => !e)} className={cn("inline-flex h-11 cursor-pointer items-center gap-[7px] rounded-[4px] border px-[15px] text-[13.5px] font-semibold", emg ? "border-brick-500 bg-brick-500 text-sable-50" : "border-line bg-card text-muted-foreground")}>
                <Icon name="clock" size={16} /> Urgences 24/7
              </button>
              <div className="relative w-[240px]">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="search" size={18} /></span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville…" className="h-11 w-full rounded-[4px] border border-line bg-background pl-[42px] pr-3.5 text-[14.5px] text-foreground outline-none focus:border-coral-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1180px] px-8 pb-[60px] pt-7">
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && vets.length === 0 ? (
          <EmptyState icon="stethoscope" title="Aucun cabinet" text="Les vétérinaires vérifiés apparaîtront ici." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-[18px]">
            {vets.map((v) => <VetCard key={v.id} v={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
