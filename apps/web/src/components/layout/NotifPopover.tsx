import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { TILE } from "./nav-data";
import { Divider, Popover } from "./Popover";

const NOTIF_TONE: Record<string, string> = { match_found: "brick", application_update: "coral", new_cat_nearby: "lavande", report_nearby: "prune" };

export function NotifPopover({ onClose, go }: { onClose: () => void; go: (to: string) => void }) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["notifications", "recent"], queryFn: () => notificationsApi.list() });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); queryClient.invalidateQueries({ queryKey: ["unread"] }); },
  });
  const items = (list.data ?? []).slice(0, 8);
  return (
    <Popover onClose={onClose} width={340}>
      <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
        <span className="text-[15px] font-bold text-foreground">Notifications</span>
        <button onClick={() => markAll.mutate()} className="mono cursor-pointer text-[10.5px] font-semibold uppercase tracking-[0.04em] text-coral-700">Tout marquer lu</button>
      </div>
      <Divider />
      <div className="max-h-[360px] overflow-y-auto">
        {items.length === 0 && <p className="px-3 py-5 text-center text-[13px] text-muted-foreground">Aucune notification.</p>}
        {items.map((nf) => (
          <button key={nf.id} onClick={() => { onClose(); go("/notifications"); }} className={cn("flex w-full gap-2.5 rounded-[11px] p-2.5 text-left transition-colors hover:bg-muted", !nf.isRead && "bg-tint-coral")}>
            <span className={cn("grid h-8 w-8 flex-none place-items-center rounded-[9px] border", TILE[NOTIF_TONE[nf.type] ?? "coral"])}><Icon name="bell" size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold leading-[1.4] text-foreground">{nf.title}</span>
              {nf.body && <span className="block text-[12.5px] leading-[1.4] text-muted-foreground">{nf.body}</span>}
              <span className="mono mt-[3px] block text-[10px] uppercase tracking-[0.04em] text-muted-foreground">{new Date(nf.createdAt).toLocaleDateString("fr-FR")}</span>
            </span>
          </button>
        ))}
      </div>
    </Popover>
  );
}
