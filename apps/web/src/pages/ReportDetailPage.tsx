import { useState } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsApi } from "@dorloter/client";
import { useAuth } from "@dorloter/client";
import type { Contact } from "@dorloter/client";
import { LostFoundMap } from "@/components/LostFoundMap";
import type { MapPin } from "@/components/LostFoundMap";
import { MapSidePanel } from "@/components/MapSidePanel";
import { ReportContentButton } from "@/components/ReportContentButton";
import { cn } from "@dorloter/ui";
import { Btn, Pill } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";

function formatDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contact, setContact] = useState<Contact | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const reportQuery = useQuery({ queryKey: ["report", id], queryFn: () => reportsApi.get(id), enabled: id !== "" });
  const matchesQuery = useQuery({ queryKey: ["report-matches", id], queryFn: () => reportsApi.matches(id), enabled: id !== "" });
  const reveal = useMutation({ mutationFn: () => reportsApi.revealContact(id), onSuccess: setContact });
  const resolve = useMutation({ mutationFn: () => reportsApi.resolve(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report", id] }) });

  if (reportQuery.isLoading) return <p className="grid h-[calc(100vh-86px)] place-items-center text-muted-foreground">Chargement…</p>;
  if (reportQuery.isError || !reportQuery.data) return <p className="grid h-[calc(100vh-86px)] place-items-center text-brick-600">Signalement introuvable.</p>;

  const r = reportQuery.data;
  const lost = r.type === "perdu";
  const resolved = r.status === "resolu";
  const matches = matchesQuery.data ?? [];

  const pins: MapPin[] = [
    { id: r.id, lng: r.location.lng, lat: r.location.lat, tone: lost ? "brick" : "coral", icon: "marker", big: true, ping: true, label: "Dernier lieu connu" },
    ...matches.map((m) => ({ id: m.report.id, lng: m.report.location.lng, lat: m.report.location.lat, tone: "lavande" as const, icon: "marker", label: "Correspondance" })),
  ];

  return (
    <div className="flex h-[calc(100vh-86px)] flex-col overflow-hidden bg-background">
      <div className="z-20 flex-none border-b border-line bg-card">
        <div className="flex items-center justify-between gap-3 px-[18px] py-2">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate("/perdus-trouves")} className="mono inline-flex h-8 flex-none items-center gap-1.5 rounded-[7px] border border-line bg-card px-[11px] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Icon name="chevron" size={13} className="rotate-180" /> Carte
            </button>
            <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
              <span className={cn("h-[9px] w-[9px] rounded-full", resolved ? "bg-coral-600" : lost ? "bg-brick-500" : "bg-coral-600")} />
              {resolved ? "Résolu" : lost ? "Alerte active" : "Animal trouvé"}
            </span>
            <span className="mono np-hide text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{[r.address, r.dateEvent].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <ReportContentButton contentType="report" contentId={r.id} />
            {!resolved && <Btn size="sm" variant="soft" icon="download" onClick={() => window.open(`/perdus-trouves/${r.id}/affiche`, "_blank")}>Affiche</Btn>}
            {user && !resolved && <Btn size="sm" variant="soft" icon="check" onClick={() => resolve.mutate()} disabled={resolve.isPending}>Marquer résolu</Btn>}
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <LostFoundMap pins={pins} activeId={r.id} focus={{ lng: r.location.lng, lat: r.location.lat }} onSelect={(pid) => { if (pid !== r.id) navigate(`/perdus-trouves/${pid}`); }} />
        </div>

        <div className={cn("pointer-events-none absolute top-3.5 z-[9] flex flex-wrap gap-2 transition-[left]", leftOpen ? "left-[360px] max-md:left-4" : "left-4")}>
          {([["brick", "Dernier lieu"], ["lavande", "Correspondances"]] as const).map(([t, l]) => (
            <span key={l} className="mono inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground shadow-[0_2px_8px_rgba(20,16,8,.08)]">
              <span className={cn("h-[9px] w-[9px] rounded-full", t === "brick" ? "bg-brick-600" : "bg-lavande-600")} /> {l}
            </span>
          ))}
        </div>

        {/* Fiche animal */}
        <MapSidePanel side="left" open={leftOpen} onToggle={() => setLeftOpen((o) => !o)} icon="heart" label="Fiche animal">
          <div className="relative h-[190px] bg-muted">
            {r.photos[0] ? <img src={r.photos[0].url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[56px]">{r.species === "chat" ? "🐱" : "🐶"}</div>}
            <div className="absolute left-2.5 top-2.5"><Pill tone={resolved ? "green" : lost ? "brick" : "green"}>{resolved ? "Résolu" : lost ? "Perdu" : "Trouvé"}</Pill></div>
          </div>
          <div className="p-4">
            <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{r.petName || (lost ? "Animal perdu" : "Animal trouvé")}</h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Pill tone="sable" icon={r.species === "chat" ? "cat" : "dog"}>{r.species}</Pill>
              {r.sex !== "inconnu" && <Pill tone="sable" icon={r.sex === "femelle" ? "venus" : "mars"}>{r.sex}</Pill>}
              {r.color && <Pill tone="sable">{r.color}</Pill>}
              <Pill tone={r.isChipped ? "green" : "sable"} icon={r.isChipped ? "badgeCheck" : undefined}>{r.isChipped ? "Pucé" : "Non pucé"}</Pill>
            </div>
            {r.distinctiveSigns && <Block title="Signes distinctifs">{r.distinctiveSigns}</Block>}
            <Block title="Description">{r.description}</Block>
            <Block title="Lieu &amp; date">{(r.address ?? "Lieu non précisé")} · le {r.dateEvent}</Block>

            <div className="mt-4 rounded-[8px] border border-lavande-300 bg-tint-lavande p-[13px]">
              <div className="mono flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-lavande-700"><Icon name="sparkles" size={14} /> Si vous le croisez</div>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-foreground">Ne le poursuivez pas. Parlez-lui doucement, proposez de la nourriture et contactez le signaleur.</p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {user ? (
                contact ? (
                  <div className="rounded-[6px] border border-coral-300 bg-tint-coral p-3 text-[14px]">
                    {contact.phone && <p>📞 {contact.phone}</p>}
                    {contact.email && <p>✉️ {contact.email}</p>}
                    {!contact.phone && !contact.email && <p className="text-muted-foreground">Aucun contact renseigné.</p>}
                  </div>
                ) : <Btn full icon="phone" onClick={() => reveal.mutate()} disabled={reveal.isPending}>Contacter</Btn>
              ) : <Btn full variant="outline" icon="user" onClick={() => navigate("/login")}>Connectez-vous pour le contact</Btn>}
            </div>
          </div>
        </MapSidePanel>

        {/* Correspondances */}
        <MapSidePanel side="right" open={rightOpen} onToggle={() => setRightOpen((o) => !o)} icon="sparkles" label="Correspondances">
          <div className="p-4">
            <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{matches.length} correspondance{matches.length > 1 ? "s" : ""} possible{matches.length > 1 ? "s" : ""}</div>
            {matches.length === 0 ? (
              <p className="mt-2 text-[13.5px] leading-[1.5] text-muted-foreground">Aucune correspondance pour l'instant. Le système recalcule à chaque nouveau signalement proche.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2.5">
                {matches.map((m) => (
                  <button key={m.id} onClick={() => navigate(`/perdus-trouves/${m.report.id}`)} className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-card p-3 text-left">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-[6px] bg-muted">
                        {m.report.primaryPhoto ? <img src={m.report.primaryPhoto.url} alt="" className="h-full w-full object-cover" /> : <Icon name={m.report.species === "chat" ? "cat" : "dog"} size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{m.report.petName || m.report.species} · {m.report.type}</p>
                        <p className="mono truncate text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground">{m.report.address ?? "Lieu ?"}</p>
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="tabular text-[20px] font-extrabold text-coral-700">{Math.round(m.score)}</div>
                      {m.distanceMeters != null && <div className="mono text-[10px] text-muted-foreground">à {formatDistance(m.distanceMeters)}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </MapSidePanel>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</div>
      <p className="mt-1.5 text-[14px] leading-[1.55] text-foreground">{children}</p>
    </div>
  );
}
