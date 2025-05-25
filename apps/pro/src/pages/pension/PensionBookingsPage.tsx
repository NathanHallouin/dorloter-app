import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pensionsApi } from "@dorloter/client";
import { PageHead, PageBody, EmptyState } from "@dorloter/ui";
import { Btn, Pill } from "@dorloter/ui";

const STATUS: Record<string, { label: string; tone: string }> = {
  envoyee: { label: "À traiter", tone: "lavande" },
  confirmee: { label: "Confirmée", tone: "green" },
  refusee: { label: "Refusée", tone: "brick" },
  annulee: { label: "Annulée", tone: "sable" },
};

export function PensionBookingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["pension-bookings"], queryFn: () => pensionsApi.adminBookings() });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => pensionsApi.setBookingStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pension-bookings"] }),
  });
  const bookings = query.data ?? [];

  return (
    <div>
      <PageHead crumb="Espace pension" title="Réservations reçues" sub="Confirmez ou refusez les demandes de garde." />
      <PageBody width={860}>
        {query.isError && <p className="text-brick-600">Accès pension requis (compte pension_admin).</p>}
        {!query.isLoading && bookings.length === 0 && !query.isError && (
          <EmptyState icon="calendar" title="Aucune réservation" text="Les demandes des adoptants apparaîtront ici." />
        )}
        <div className="flex flex-col gap-3">
          {bookings.map((b) => {
            const s = STATUS[b.status] ?? { label: b.status, tone: "sable" };
            return (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[8px] border border-line bg-card p-[18px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[18px] font-semibold text-foreground">{b.petName ?? b.species}</span>
                    <Pill tone={s.tone}>{s.label}</Pill>
                  </div>
                  <p className="mono mt-[5px] text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                    {b.species} · {b.startDate} → {b.endDate} · {b.nights} nuit{b.nights > 1 ? "s" : ""}{b.totalPrice != null ? ` · ${b.totalPrice} €` : ""}
                  </p>
                </div>
                {b.status === "envoyee" && (
                  <div className="flex flex-none gap-2">
                    <Btn size="sm" icon="check" onClick={() => update.mutate({ id: b.id, status: "confirmee" })} disabled={update.isPending}>Confirmer</Btn>
                    <Btn size="sm" variant="outline" icon="x" onClick={() => update.mutate({ id: b.id, status: "refusee" })} disabled={update.isPending}>Refuser</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PageBody>
    </div>
  );
}
