import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { PageHead, PageBody, EmptyState } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => notificationsApi.list() });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread"] });
  };
  const markRead = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate });

  const notifications = data ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div>
      <PageHead
        crumb="Notifications" title="Notifications"
        action={hasUnread ? <Btn variant="ghost" icon="check" onClick={() => markAll.mutate()}>Tout marquer comme lu</Btn> : undefined}
      />
      <PageBody width={820}>
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && notifications.length === 0 ? (
          <EmptyState icon="bell" title="Aucune notification" text="Vos alertes (matchs, candidatures, messages) apparaîtront ici." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={cn("rounded-[6px] border p-[18px] text-left", n.isRead ? "cursor-default border-line bg-card" : "cursor-pointer border-coral-300 bg-tint-coral")}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <p className="font-display text-[17px] font-semibold text-foreground">{n.title}</p>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-coral-600" />}
                </div>
                {n.body && <p className="mt-1 text-[14px] text-muted-foreground">{n.body}</p>}
                <p className="mono mt-2 text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">{new Date(n.createdAt).toLocaleString("fr-FR")}</p>
              </button>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}
