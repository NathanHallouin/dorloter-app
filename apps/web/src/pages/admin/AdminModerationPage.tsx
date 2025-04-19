import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { moderationApi } from "@/api/moderation";
import { PageHead, PageBody, EmptyState } from "@/ui/forms";
import { Btn, Pill } from "@/ui/primitives";

const CONTENT_LABEL: Record<string, string> = {
  pet: "Animal", report: "Signalement", pension: "Pension", shelter: "Refuge", message: "Message", user: "Utilisateur",
};

export function AdminModerationPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["moderation"], queryFn: () => moderationApi.listPending() });
  const resolve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "masque" | "rejete" }) => moderationApi.resolve(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moderation"] }),
  });
  const reports = query.data ?? [];

  return (
    <div>
      <PageHead crumb="Administration" title="Modération" sub="File des contenus signalés par la communauté." />
      <PageBody width={860}>
        {query.isError && <p className="text-brick-600">Accès réservé à l'administration (platform_admin).</p>}
        {!query.isLoading && reports.length === 0 && !query.isError && (
          <EmptyState icon="shieldCheck" title="File vide" text="Aucun contenu signalé en attente. Tout est en ordre." />
        )}
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-[8px] border border-line bg-card p-[18px]">
              <div className="flex flex-wrap items-start justify-between gap-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Pill tone="brick">{CONTENT_LABEL[r.contentType] ?? r.contentType}</Pill>
                    <Pill tone="sable">{r.reason}</Pill>
                  </div>
                  {r.comment && <p className="mt-2.5 text-[14px] text-foreground">{r.comment}</p>}
                  <p className="mono mt-2 text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground">
                    cible {r.contentId.slice(0, 8)}… · {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-none gap-2">
                  <Btn size="sm" icon="eye" onClick={() => resolve.mutate({ id: r.id, status: "masque" })} disabled={resolve.isPending}>Masquer</Btn>
                  <Btn size="sm" variant="outline" icon="x" onClick={() => resolve.mutate({ id: r.id, status: "rejete" })} disabled={resolve.isPending}>Rejeter</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </div>
  );
}
