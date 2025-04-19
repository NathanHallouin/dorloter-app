import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { pensionsApi } from "@/api/pensions";
import { PageHead, PageBody, EmptyState } from "@/ui/forms";
import { Btn, Pill } from "@/ui/primitives";

const STATUS: Record<string, { label: string; tone: string }> = {
  envoyee: { label: "Envoyée", tone: "lavande" },
  confirmee: { label: "Confirmée", tone: "green" },
  refusee: { label: "Refusée", tone: "brick" },
  annulee: { label: "Annulée", tone: "sable" },
};

export function MyBookingsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["my-bookings"], queryFn: () => pensionsApi.myBookings() });
  const bookings = data ?? [];

  return (
    <div>
      <PageHead crumb="Réservations" title="Mes réservations" sub="Vos demandes de garde en pension." />
      <PageBody width={820}>
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && bookings.length === 0 ? (
          <EmptyState icon="calendar" title="Aucune réservation" text="Trouvez une pension agréée et envoyez votre première demande."
            action={<Btn icon="home" onClick={() => navigate("/pensions")}>Voir les pensions</Btn>} />
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => {
              const s = STATUS[b.status] ?? { label: b.status, tone: "sable" };
              return (
                <div key={b.id} className="flex items-center justify-between gap-4 rounded-[8px] border border-line bg-card p-[18px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {b.pensionSlug ? (
                        <Link to={`/pensions/${b.pensionSlug}`} className="font-display text-[18px] font-semibold text-foreground">{b.pensionName}</Link>
                      ) : (
                        <span className="font-display text-[18px] font-semibold text-foreground">{b.pensionName ?? "Pension"}</span>
                      )}
                      <Pill tone={s.tone}>{s.label}</Pill>
                    </div>
                    <p className="mono mt-[5px] text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                      {b.petName ?? b.species} · {b.startDate} → {b.endDate} · {b.nights} nuit{b.nights > 1 ? "s" : ""}
                    </p>
                  </div>
                  {b.totalPrice != null && <span className="tabular flex-none font-display text-[22px] font-semibold text-coral-700">{b.totalPrice} €</span>}
                </div>
              );
            })}
          </div>
        )}
      </PageBody>
    </div>
  );
}
