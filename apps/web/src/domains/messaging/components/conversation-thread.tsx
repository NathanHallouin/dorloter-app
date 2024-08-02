"use client";

import { useEffect, useRef } from "react";
import { CircleDot } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { MessageComposer } from "./message-composer";
import { useMessagingStream } from "@messaging/hooks/use-messaging-stream";
import { markConversationRead } from "@messaging/actions";
import type { MessageDTO } from "@messaging/bus";
import { cn } from "@shared/utils";

interface ConversationThreadProps {
  conversationId: string;
  currentUserId: string;
  side: "user" | "shelter";
  initialMessages: MessageDTO[];
  peerName: string;
  peerUserId?: string; // l'id du pair pour afficher le statut en ligne
}

export function ConversationThread({
  conversationId,
  currentUserId,
  side,
  initialMessages,
  peerName,
  peerUserId,
}: ConversationThreadProps) {
  const { messages, typingUser, onlinePeers, connectionState } =
    useMessagingStream(conversationId, initialMessages, currentUserId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Auto-scroll en bas à l'arrivée d'un message si l'user était déjà en bas.
  // Sinon, on ne pousse pas le scroll (respecte l'intention de lecture).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (autoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
    autoScrollRef.current = distFromBottom < 120;
  }

  // Marque lu à l'ouverture + à chaque nouveau message reçu si focus actif
  useEffect(() => {
    void markConversationRead(conversationId);
  }, [conversationId, messages.length]);

  const peerOnline = peerUserId ? onlinePeers.has(peerUserId) : false;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{peerName}</span>
          {peerOnline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
              <CircleDot className="h-2.5 w-2.5" />
              En ligne
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {connectionState === "connected"
            ? "Temps réel"
            : connectionState === "polling"
              ? "Synchronisation"
              : connectionState === "connecting"
                ? "Connexion…"
                : "Hors ligne"}
        </span>
      </div>

      {/* Thread */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((m) => {
          const mine = m.senderType === side;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              mine={mine}
              currentUserId={currentUserId}
              showReadReceipt={mine}
            />
          );
        })}
        <div className={cn(typingUser ? "block" : "hidden")}>
          <TypingIndicator visible={!!typingUser} />
        </div>
      </div>

      {/* Composer */}
      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
