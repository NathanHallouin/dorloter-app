import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";

export function ShelterMessagesPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const conversations = useQuery({ queryKey: ["shelter-conversations"], queryFn: () => shelterApi.conversations(), refetchInterval: 15_000 });
  const messages = useQuery({ queryKey: ["shelter-conv-messages", selected], queryFn: () => shelterApi.conversationMessages(selected!), enabled: !!selected, refetchInterval: 5000 });

  useEffect(() => {
    if (!selected) return;
    shelterApi.markConversationRead(selected).then(() => queryClient.invalidateQueries({ queryKey: ["shelter-conversations"] }));
  }, [selected, queryClient]);

  const send = useMutation({ mutationFn: (content: string) => shelterApi.sendMessage(selected!, content), onSuccess: () => { setDraft(""); queryClient.invalidateQueries({ queryKey: ["shelter-conv-messages", selected] }); } });
  const onSubmit = (e: FormEvent) => { e.preventDefault(); if (selected && draft.trim()) send.mutate(draft.trim()); };
  const convs = conversations.data ?? [];

  return (
    <div className="-mx-5 -mt-7 -mb-16 grid h-[calc(100dvh-64px)] min-h-[420px] grid-cols-[300px_1fr] overflow-hidden bg-card md:-mx-[34px] md:-mt-8">
        <aside className="overflow-y-auto border-r border-line">
          {convs.length === 0 && <p className="p-4 text-[13px] text-muted-foreground">Aucune conversation.</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className={cn("block w-full border-b border-line px-4 py-[13px] text-left", selected === c.id ? "border-l-[3px] border-l-coral-500 bg-tint-coral" : "border-l-[3px] border-l-transparent")}>
              <div className="flex justify-between gap-1.5">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-foreground">{c.subject ?? "Conversation"}</span>
                {c.unreadCount > 0 && <span className="mono tabular grid h-[18px] min-w-[18px] flex-none place-items-center rounded-full bg-coral-600 px-[5px] text-[10px] font-bold text-sable-50">{c.unreadCount}</span>}
              </div>
              <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-muted-foreground">{c.lastMessagePreview ?? "—"}</p>
            </button>
          ))}
        </aside>
        <section className="flex flex-col bg-background">
          {!selected ? <p className="m-auto text-muted-foreground">Sélectionnez une conversation.</p> : (
            <>
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-[18px]">
                {(messages.data ?? []).map((m) => {
                  const me = m.senderType === "shelter";
                  return (
                    <div key={m.id} className={cn("max-w-[75%] px-3.5 py-2.5 text-[14px]", me ? "self-end rounded-[16px_16px_4px_16px] bg-coral-600 text-sable-50" : "self-start rounded-[16px_16px_16px_4px] border border-line bg-card text-foreground")}>{m.content}</div>
                  );
                })}
              </div>
              <form onSubmit={onSubmit} className="flex flex-none gap-2.5 border-t border-line bg-card p-3.5">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Répondre…" className="h-11 flex-1 rounded-full border border-line bg-background px-[18px] text-[14px] text-foreground outline-none" />
                <button type="submit" disabled={send.isPending || !draft.trim()} aria-label="Envoyer" className="grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-full bg-coral-600 text-sable-50 disabled:opacity-50"><Icon name="send" size={17} /></button>
              </form>
            </>
          )}
        </section>
    </div>
  );
}
