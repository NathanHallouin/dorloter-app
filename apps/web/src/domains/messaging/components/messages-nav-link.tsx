"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { cn } from "@shared/utils";

/**
 * Lien "Messages" dans la navbar, avec badge de compteur non lus rafraîchi
 * toutes les 60s via /api/messages/unread-count. Clique vers /messages
 * (côté user) ou /shelter-messages (si la session a un shelterId).
 *
 * On envoie toujours vers /messages — si l'user est shelter_admin ET a
 * aussi des messages en tant que particulier, il verra sa boîte. Pour voir
 * les messages refuge, il passe par la sidebar /shelter-messages.
 */
export function MessagesNavLink() {
  const [count, setCount] = useState(0);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/messages/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          asUser: number;
          asShelter: number;
          total: number;
        };
        setCount(data.total);
        setAuthed(true);
      } catch {
        setAuthed(false);
      }
    }
    fetchCount();
    const iv = window.setInterval(fetchCount, 60_000);
    return () => window.clearInterval(iv);
  }, []);

  if (authed === false) return null;

  return (
    <Link
      href="/messages"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-sable-100"
      aria-label="Messages"
    >
      <MessageCircle className="h-5 w-5" />
      {count > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white"
          )}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
