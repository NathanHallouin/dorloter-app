import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { applicationsApi } from "@/api/applications";
import { PageHead, PageBody, EmptyState } from "@dorloter/ui";
import { Btn, Pill } from "@dorloter/ui";

const STATUS: Record<string, { label: string; tone: string }> = {
  envoyee: { label: "Envoyée", tone: "lavande" },
  en_cours: { label: "En cours", tone: "lavande" },
  acceptee: { label: "Acceptée", tone: "green" },
  refusee: { label: "Refusée", tone: "brick" },
  annulee: { label: "Annulée", tone: "sable" },
};

export function ApplicationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["applications"], queryFn: () => applicationsApi.mine() });
  const applications = data ?? [];

  return (
    <div>
      <PageHead crumb="Candidatures" title="Mes candidatures" sub="Suivez l'avancement de vos demandes d'adoption." />
      <PageBody width={820}>
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && applications.length === 0 ? (
          <EmptyState icon="heart" title="Aucune candidature" text="Trouvez un compagnon et déposez votre première candidature."
            action={<Btn icon="paw" onClick={() => navigate("/adopter")}>Voir le catalogue</Btn>} />
        ) : (
          <div className="flex flex-col gap-3">
            {applications.map((a) => {
              const s = STATUS[a.status] ?? { label: a.status, tone: "sable" };
              return (
                <div key={a.id} className="flex items-center justify-between gap-4 rounded-[6px] border border-line bg-card p-[18px]">
                  <div className="min-w-0">
                    <Link to={`/adopter/${a.petId}`} className="mono text-[12px] font-semibold uppercase tracking-[0.06em] text-coral-700">Voir l'animal</Link>
                    <p className="mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] text-muted-foreground">{a.motivation}</p>
                  </div>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>
    </div>
  );
}
