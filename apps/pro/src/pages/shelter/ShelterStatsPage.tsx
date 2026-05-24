import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shelterApi } from "@dorloter/client";
import { Stat, Panel, Bars, Table, Td, DashPageHead, MiniBtn } from "@/components/dash/kit";

const MONTHS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
const monthLabel = (ym: string) => MONTHS[Number(ym.split("-")[1]) - 1] ?? ym;
const SPECIES: Record<string, string> = { chat: "Chat", chien: "Chien" };

export function ShelterStatsPage() {
  const stats = useQuery({ queryKey: ["shelter-stats"], queryFn: () => shelterApi.stats() });
  const s = stats.data;

  return (
    <div>
      <DashPageHead
        title="Statistiques"
        desc="Vos indicateurs clés pour piloter les adoptions : conversion, délais, animaux à booster."
      />

      {stats.isError && <p className="text-brick-600">Accès refuge requis.</p>}
      {stats.isLoading && <div className="dash-stats grid grid-cols-4 gap-3.5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-card border border-line bg-card" />)}</div>}

      {s && (
        <>
          {/* Alerte actionnable : candidatures en attente */}
          {s.applications.pending > 0 && (
            <Link to="/refuge/candidatures" className="mb-[22px] flex items-center gap-3 rounded-card border border-brick-300 bg-brick-50 p-3.5 hover:border-brick-400">
              <span className="mono text-[11px] font-bold uppercase tracking-wide text-brick-600">Action</span>
              <span className="text-sm text-foreground">
                {s.applications.pending} candidature{s.applications.pending > 1 ? "s" : ""} sans réponse · étudiez-les pour ne pas perdre d'adoptants.
              </span>
              <MiniBtn label="Traiter" icon="arrow" />
            </Link>
          )}

          <div className="dash-stats mb-[22px] grid grid-cols-4 gap-3.5">
            <Stat icon="percent" label="Taux de conversion" value={`${s.conversionRate}%`} tone="coral" sub="candidatures → adoptions" />
            <Stat icon="clock" label="Délai moyen d'adoption" value={s.avgDaysToAdoption != null ? `${Math.round(s.avgDaysToAdoption)} j` : "—"} tone="lavande" sub="publication → adoption" />
            <Stat icon="badgeCheck" label="Adoptions ce mois-ci" value={String(s.adoptions.thisMonth)} tone="prune" />
            <Stat icon="trending" label="Adoptions cette année" value={String(s.adoptions.thisYear)} tone="coral" sub={`${s.adoptions.total} au total`} />
          </div>

          <div className="dash-split grid grid-cols-[1fr_340px] items-start gap-[18px]">
            <Panel title="Adoptions sur 12 mois" hint="Contrats d'adoption signés par mois">
              {s.adoptionsByMonth.every((m) => m.count === 0) ? (
                <p className="text-sm text-muted-foreground">Aucune adoption signée sur la période. Les données apparaîtront ici au fil des signatures de contrats.</p>
              ) : (
                <Bars data={s.adoptionsByMonth.map((m) => ({ k: monthLabel(m.month), v: m.count }))} />
              )}
            </Panel>

            <Panel title="Animaux par statut">
              <Bars tone="lavande" data={[
                { k: "Dispo", v: s.totals.available },
                { k: "Réservé", v: s.totals.reserved },
                { k: "Adopté", v: s.totals.adopted },
              ]} />
            </Panel>
          </div>

          <div className="mt-[18px]">
            <Panel
              title="Animaux en difficulté de placement"
              hint="Disponibles depuis plus de 90 jours, avec peu de candidatures · à mettre en avant"
              pad={false}
            >
              <div className="px-1 pt-1">
                {s.hardToPlace.length === 0 ? (
                  <p className="p-[18px] text-muted-foreground">Aucun animal en difficulté. Vos protégés trouvent preneur dans les temps 👏</p>
                ) : (
                  <Table head={["Animal", "Espèce", "En ligne depuis", "Candidatures", ""]}>
                    {s.hardToPlace.map((h) => (
                      <tr key={h.id}>
                        <Td><Link to={`/refuge/animaux/${h.id}`} className="font-semibold hover:text-coral-700">{h.name}</Link></Td>
                        <Td><span className="mono text-[12px] text-muted-foreground">{SPECIES[h.species] ?? h.species}</span></Td>
                        <Td><span className={h.daysListed > 180 ? "font-semibold text-brick-600" : "text-foreground"}>{h.daysListed} j</span></Td>
                        <Td><span className={h.applications === 0 ? "font-semibold text-brick-600" : "text-foreground"}>{h.applications}</span></Td>
                        <Td right><Link to={`/refuge/animaux/${h.id}`}><MiniBtn label="Booster" icon="sparkles" /></Link></Td>
                      </tr>
                    ))}
                  </Table>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
