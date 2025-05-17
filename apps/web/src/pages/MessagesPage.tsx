import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messagingApi } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { Eyebrow } from "@dorloter/ui";

export function MessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const convsQuery = useQuery({ queryKey: ["conversations"], queryFn: () => messagingApi.conversations(), refetchInterval: 20_000 });
  const conversations = convsQuery.data ?? [];
  const selectedId = id ?? conversations[0]?.id;
  const active = conversations.find((c) => c.id === selectedId);

  const messagesQuery = useQuery({ queryKey: ["messages", selectedId], queryFn: () => messagingApi.messages(selectedId!), enabled: !!selectedId, refetchInterval: 5000 });
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    if (!selectedId) return;
    messagingApi.markRead(selectedId).then(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    });
  }, [selectedId, queryClient]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages.length, selectedId]);

  const send = useMutation({
    mutationFn: (content: string) => messagingApi.send(selectedId!, content),
    onSuccess: () => { setDraft(""); queryClient.invalidateQueries({ queryKey: ["messages", selectedId] }); queryClient.invalidateQueries({ queryKey: ["conversations"] }); },
  });
  const onSubmit = (e: FormEvent) => { e.preventDefault(); if (selectedId && draft.trim()) send.mutate(draft.trim()); };

  return (
    <div className="flex h-[calc(100vh-86px)] overflow-hidden bg-background">
      {/* liste */}
      <aside className={cn("flex w-[340px] flex-none flex-col border-r border-line bg-card max-md:w-full", id && "max-md:hidden")}>
        <header className="flex-none border-b border-line px-5 pb-3.5 pt-[18px]">
          <Eyebrow>Boîte de réception</Eyebrow>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.01em] text-foreground">Messages</h1>
        </header>
        <div className="flex-1 overflow-y-auto">
          {convsQuery.isLoading && <p className="p-4 text-[13px] text-muted-foreground">Chargement…</p>}
          {!convsQuery.isLoading && conversations.length === 0 && <p className="p-4 text-[13px] text-muted-foreground">Aucune conversation. Contactez un refuge depuis la fiche d'un animal.</p>}
          {conversations.map((c) => {
            const on = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/messages/${c.id}`)}
                className={cn("flex w-full gap-3 border-b border-line px-[18px] py-[13px] text-left transition-colors", on ? "border-l-[3px] border-l-coral-500 bg-tint-coral" : "border-l-[3px] border-l-transparent hover:bg-muted")}
              >
                <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[10px] bg-tint-coral text-coral-600"><Icon name="home" size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-foreground">{c.subject ?? "Conversation"}</span>
                    <span className="mono flex-none text-[10px] text-muted-foreground">{new Date(c.lastMessageAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div className="mt-0.5"><span className="mono inline-block rounded-[3px] border border-coral-300 bg-coral-50 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.04em] text-coral-700">Refuge</span></div>
                  <p className={cn("mt-[5px] line-clamp-1 text-[12.5px]", on || c.unreadCount ? "text-foreground" : "text-muted-foreground")}>
                    {c.lastSenderType === "user" ? "Vous : " : ""}{c.lastMessagePreview ?? "Pas encore de message"}
                  </p>
                </div>
                {c.unreadCount > 0 && !on && (
                  <span className="mono tabular grid h-[19px] min-w-[19px] flex-none place-items-center self-center rounded-full bg-coral-600 px-[5px] text-[10.5px] font-bold text-sable-50">{c.unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* fil */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !id && "max-md:hidden")}>
        {!active ? (
          <p className="m-auto text-muted-foreground">Sélectionnez une conversation.</p>
        ) : (
          <>
            <header className="flex flex-none items-center gap-3 border-b border-line bg-card px-[22px] py-3">
              <button onClick={() => navigate("/messages")} aria-label="Retour" className="md:hidden"><Icon name="chevron" size={20} className="rotate-180 text-muted-foreground" /></button>
              <span className="grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-tint-coral text-coral-600"><Icon name="home" size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-semibold text-foreground">{active.subject ?? "Conversation"}</div>
                <div className="mono mt-px text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">En ligne il y a peu</div>
              </div>
              <button aria-label="Infos" className="grid h-10 w-10 flex-none place-items-center rounded-[10px] border border-line bg-card text-muted-foreground"><Icon name="phone" size={18} /></button>
            </header>

            <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background p-[22px]">
              {messagesQuery.isLoading && <p className="text-muted-foreground">Chargement…</p>}
              {!messagesQuery.isLoading && messages.length === 0 && <p className="m-auto text-muted-foreground">Démarrez la conversation ci-dessous.</p>}
              {messages.map((m) => {
                const me = m.senderType === "user";
                return (
                  <div key={m.id} className={cn("max-w-[72%]", me ? "self-end" : "self-start")}>
                    <div className={cn("px-[15px] py-[11px] text-[14.5px] leading-[1.5]", me ? "rounded-[16px_16px_4px_16px] bg-coral-600 text-sable-50" : "rounded-[16px_16px_16px_4px] border border-line bg-card text-foreground")}>{m.content}</div>
                    <div className={cn("mono mt-1 text-[9.5px] uppercase tracking-[0.05em] text-muted-foreground", me ? "text-right" : "text-left")}>
                      {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="flex flex-none items-center gap-2.5 border-t border-line bg-card px-[22px] py-3.5">
              <button type="button" aria-label="Pièce jointe" className="grid h-10 w-10 flex-none place-items-center rounded-[10px] border border-line bg-card text-muted-foreground"><Icon name="paperclip" size={19} /></button>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un message…" className="h-[46px] flex-1 rounded-full border border-line bg-background px-[18px] text-[14.5px] text-foreground outline-none focus:border-coral-500" />
              <button type="submit" disabled={send.isPending || !draft.trim()} aria-label="Envoyer" className="grid h-[46px] w-[46px] flex-none cursor-pointer place-items-center rounded-full bg-coral-600 text-sable-50 shadow-[0_4px_12px_rgba(24,90,64,.34)] disabled:opacity-50"><Icon name="send" size={18} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
