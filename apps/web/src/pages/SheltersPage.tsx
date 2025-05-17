import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { sheltersApi } from "@dorloter/client";
import type { ShelterListItem } from "@dorloter/client";
import { Icon } from "@dorloter/ui";
import { Eyebrow } from "@dorloter/ui";
import { EmptyState } from "@dorloter/ui";

function ShelterCard({ s }: { s: ShelterListItem }) {
  return (
    <Link to={`/refuges/${s.slug}`} className="block overflow-hidden rounded-[6px] border border-line bg-card">
      <div className="grid aspect-video place-items-center bg-muted text-sable-300">
        {s.coverUrl ? <img src={s.coverUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="building" size={40} />}
      </div>
      <div className="px-[18px] py-[15px]">
        <h3 className="text-[20px] font-semibold text-foreground">{s.name}</h3>
        {s.address && <p className="mono mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.05em] text-muted-foreground"><Icon name="pin" size={12} /> {s.address}</p>}
        {s.description && <p className="mt-2 line-clamp-2 text-[13.5px] text-muted-foreground">{s.description}</p>}
      </div>
    </Link>
  );
}

export function SheltersPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["shelters", q], queryFn: () => sheltersApi.list({ search: q || undefined }) });
  const shelters = data?.data ?? [];

  return (
    <div>
      <div className="border-b border-line bg-card">
        <div className="mx-auto max-w-[1180px] px-8 py-7">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Link to="/" className="text-muted-foreground">Accueil</Link><Icon name="chevron" size={14} /><span className="font-semibold text-coral-700">Refuges</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow>Nos partenaires</Eyebrow>
              <h1 className="mt-2 text-[38px] font-semibold tracking-[-0.01em] text-foreground">Refuges &amp; associations</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">{shelters.length} structures vérifiées qui accueillent les animaux.</p>
            </div>
            <div className="relative w-[240px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="search" size={18} /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville…" className="h-11 w-full rounded-[4px] border border-line bg-background pl-[42px] pr-3.5 text-[14.5px] text-foreground outline-none focus:border-coral-500" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1180px] px-8 pb-[60px] pt-7">
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && shelters.length === 0 ? (
          <EmptyState icon="building" title="Aucun refuge" text="Les refuges vérifiés apparaîtront ici." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]">
            {shelters.map((s) => <ShelterCard key={s.id} s={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
