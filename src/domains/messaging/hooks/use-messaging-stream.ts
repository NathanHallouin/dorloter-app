"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageDTO, ReactionAgg } from "@messaging/bus";

/**
 * Hook qui ouvre un stream SSE pour une conversation et expose l'état
 * temps réel (messages, typing, read receipts, presence). Se reconnecte
 * automatiquement (EventSource natif) et bascule sur polling si le
 * stream échoue 3 fois d'affilée.
 */
export function useMessagingStream(
  conversationId: string,
  initialMessages: MessageDTO[],
  currentUserId: string
) {
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlinePeers, setOnlinePeers] = useState<Set<string>>(new Set());
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "polling" | "disconnected"
  >("connecting");

  // Timeout typing indicator (auto-clear après 3s)
  const typingTimeout = useRef<number | null>(null);
  // Dernier timestamp vu, pour le fallback polling — géré en ref pour ne
  // pas déclencher de re-subscription sur chaque nouveau message.
  const lastSeenAt = useRef<Date>(
    initialMessages[initialMessages.length - 1]?.createdAt ?? new Date(0)
  );

  const upsertMessage = useCallback((msg: MessageDTO) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx === -1) return [...prev, msg];
      const next = [...prev];
      next[idx] = msg;
      return next;
    });
    if (new Date(msg.createdAt) > new Date(lastSeenAt.current)) {
      lastSeenAt.current = msg.createdAt;
    }
  }, []);

  const applyReactions = useCallback(
    (messageId: string, reactions: ReactionAgg[]) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    },
    []
  );

  const applyReadAt = useCallback(
    (messageIds: string[], readAt: Date) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id) ? { ...m, readAt } : m
        )
      );
    },
    []
  );

  // ─── SSE stream ────────────────────────────────────────────────────────
  useEffect(() => {
    let failures = 0;
    let pollTimer: number | null = null;
    let es: EventSource | null = null;
    let aborted = false;

    function startPolling() {
      setConnectionState("polling");
      const tick = async () => {
        if (aborted) return;
        try {
          const res = await fetch(
            `/api/messages/poll?conversationId=${conversationId}&since=${encodeURIComponent(new Date(lastSeenAt.current).toISOString())}`
          );
          if (res.ok) {
            const body = (await res.json()) as {
              messages: MessageDTO[];
              at: string;
            };
            for (const m of body.messages) upsertMessage(m);
          }
        } catch {
          // ignore — on retentera au prochain tick
        }
        pollTimer = window.setTimeout(tick, 5000);
      };
      pollTimer = window.setTimeout(tick, 100);
    }

    function startSSE() {
      setConnectionState("connecting");
      es = new EventSource(
        `/api/messages/stream?conversationId=${conversationId}`
      );

      es.addEventListener("connected", () => {
        failures = 0;
        setConnectionState("connected");
      });

      es.addEventListener("message.created", (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data);
        if (payload?.message) upsertMessage(payload.message);
      });

      es.addEventListener("message.updated", (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data);
        if (payload?.message) upsertMessage(payload.message);
      });

      es.addEventListener("reaction.toggled", (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          messageId: string;
          reactions: ReactionAgg[];
        };
        applyReactions(payload.messageId, payload.reactions);
      });

      es.addEventListener("conversation.read", (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          messageIds: string[];
          readAt: string;
          readerId: string;
        };
        // On n'applique que si c'est l'autre camp qui a lu (pas nous)
        if (payload.readerId !== currentUserId) {
          applyReadAt(payload.messageIds, new Date(payload.readAt));
        }
      });

      es.addEventListener("typing.changed", (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          userId: string;
          isTyping: boolean;
        };
        if (payload.userId === currentUserId) return;
        if (payload.isTyping) {
          setTypingUser(payload.userId);
          if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
          typingTimeout.current = window.setTimeout(() => {
            setTypingUser(null);
          }, 3500);
        } else {
          setTypingUser(null);
          if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
        }
      });

      es.addEventListener("presence.changed", (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          userId: string;
          online: boolean;
        };
        if (payload.userId === currentUserId) return;
        setOnlinePeers((prev) => {
          const next = new Set(prev);
          if (payload.online) next.add(payload.userId);
          else next.delete(payload.userId);
          return next;
        });
      });

      es.onerror = () => {
        failures += 1;
        if (failures >= 3 && es) {
          es.close();
          es = null;
          startPolling();
        }
      };
    }

    startSSE();

    return () => {
      aborted = true;
      if (es) es.close();
      if (pollTimer !== null) window.clearTimeout(pollTimer);
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    };
  }, [conversationId, currentUserId, upsertMessage, applyReactions, applyReadAt]);

  return {
    messages,
    typingUser,
    onlinePeers,
    connectionState,
  };
}
