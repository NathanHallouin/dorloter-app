import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import type { ReportSummary } from "@/api/types";
import { LostFoundMap } from "@/components/LostFoundMap";
import type { MapPin } from "@/components/LostFoundMap";
import { MapSidePanel } from "@/components/MapSidePanel";
import { cn } from "@dorloter/ui";
import { Btn, Pill } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";

export function ReportsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"tous" | "perdu" | "trouve">("tous");
  const [sel, setSel] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);

  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => reportsApi.list({ limit: 50 }) });
  const all = data?.data ?? [];
  const list = all.filter((r) => tab === "tous" || r.type === tab);
  const selected = list.find((r) => r.id === sel) ?? null;
  const pins: MapPin[] = list.map((r) => ({
    id: r.id, lng: r.location.lng, lat: r.location.lat,
    tone: r.type === "perdu" ? "brick" : "coral", icon: r.species === "chat" ? "cat" : "dog",
    big: true, ping: r.type === "perdu", label: r.petName || (r.type === "perdu" ? "Perdu" : "Trouvé"),
  }));

  return (
    <div className="flex h-[calc(100vh-86px)] flex-col overflow-hidden bg-background">
      <div className="z-20 flex-none border-b border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 px-[22px] py-2.5">
          <div className="flex items-center gap-3.5">
            <h1 className="text-[20px] font-semibold text-foreground">Perdus &amp; trouvés</h1>
            <span className="mono inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <span className="h-[7px] w-[7px] rounded-full bg-brick-500" /> {list.length} alertes
            </span>
          </div>
          <div className="flex items-center gap-2">
            {([["tous", "Tout", null], ["perdu", "Perdus", "radio"], ["trouve", "Trouvés", "badgeCheck"]] as const).map(([v, l, ic]) => (
              <button key={v} onClick={() => setTab(v)}
                className={cn("inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[7px] border px-[13px] text-[12.5px] font-semibold", tab === v ? "border-coral-600 bg-coral-600 text-sable-50" : "border-line bg-card text-muted-foreground")}>
                {ic && <Icon name={ic} size={14} />}{l}
              </button>
            ))}
            <Btn size="sm" icon="radio" onClick={() => navigate("/perdus-trouves/nouveau")}>Signaler</Btn>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <LostFoundMap pins={pins} activeId={sel} focus={selected ? { lng: selected.location.lng, lat: selected.location.lat } : null} onSelect={setSel} />
        </div>

        <div className={cn("mono pointer-events-none absolute top-3.5 z-[9] inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-foreground shadow-[0_2px_10px_rgba(20,16,8,.1)] transition-[left]", listOpen ? "left-[360px] max-md:left-4" : "left-4")}>
          <Icon name="marker" size={13} className="text-coral-600" /> Carte de recherche
        </div>

        <MapSidePanel side="left" open={listOpen} onToggle={() => setListOpen((o) => !o)} icon="radio" label="Signalements">
          <div className="flex flex-col gap-2.5 p-3">
            {isLoading && <p className="p-2 text-[13px] text-muted-foreground">Chargement…</p>}
            {!isLoading && list.length === 0 && <p className="p-2 text-[13px] text-muted-foreground">Aucun signalement.</p>}
            {list.map((r) => <ReportRow key={r.id} r={r} active={sel === r.id} onClick={() => setSel(r.id)} onOpen={() => navigate(`/perdus-trouves/${r.id}`)} />)}
          </div>
        </MapSidePanel>

        {selected && (
          <div className="absolute bottom-4 left-1/2 z-[9] flex w-[min(440px,calc(100%-32px))] -translate-x-1/2 items-center gap-3.5 rounded-[10px] border border-line bg-card p-3 shadow-[0_14px_36px_rgba(20,16,8,.18)]">
            <div className="grid h-[60px] w-[60px] flex-none place-items-center overflow-hidden rounded-[6px] bg-muted text-[26px]">
              {selected.primaryPhoto ? <img src={selected.primaryPhoto.url} alt="" className="h-full w-full object-cover" /> : (selected.species === "chat" ? "🐱" : "🐶")}
            </div>
            <div className="min-w-0 flex-1">
              <Pill tone={selected.type === "perdu" ? "brick" : "green"}>{selected.type === "perdu" ? "Perdu" : "Trouvé"}</Pill>
              <div className="mt-1 font-display text-[17px] font-semibold text-foreground">{selected.petName || (selected.type === "perdu" ? "Animal perdu" : "Animal trouvé")}</div>
              <div className="mono mt-0.5 truncate text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground">{selected.address ?? "Lieu ?"} · {selected.dateEvent}</div>
            </div>
            <Btn size="sm" iconRight="arrow" onClick={() => navigate(`/perdus-trouves/${selected.id}`)}>Ouvrir</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportRow({ r, active, onClick, onOpen }: { r: ReportSummary; active: boolean; onClick: () => void; onOpen: () => void }) {
  const lost = r.type === "perdu";
  return (
    <div onClick={onClick} onDoubleClick={onOpen}
      className={cn("flex cursor-pointer gap-3 rounded-[8px] border p-[11px] transition-all", active ? "border-coral-500 bg-tint-coral shadow-[0_6px_16px_rgba(20,16,8,.08)]" : "border-line bg-card")}>
      <div className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-[6px] bg-muted text-[26px]">
        {r.primaryPhoto ? <img src={r.primaryPhoto.url} alt="" className="h-full w-full object-cover" /> : (r.species === "chat" ? "🐱" : "🐶")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Pill tone={lost ? "brick" : "green"}>{lost ? "Perdu" : "Trouvé"}</Pill>
          <Pill tone="sable" icon={r.species === "chat" ? "cat" : "dog"}>{r.species}</Pill>
        </div>
        <div className="mt-1.5 font-display text-[16px] font-semibold text-foreground">{r.petName || (lost ? "Animal perdu" : "Animal trouvé")}</div>
        <div className="mono mt-[3px] flex items-center gap-1 truncate text-[10px] uppercase tracking-[0.05em] text-muted-foreground"><Icon name="marker" size={12} /> {r.address ?? "Lieu ?"} · {r.dateEvent}</div>
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="mono mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-coral-700">Voir la fiche <Icon name="arrow" size={13} /></button>
      </div>
    </div>
  );
}
