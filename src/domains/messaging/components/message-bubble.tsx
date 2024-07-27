"use client";

import { useState } from "react";
import { Check, CheckCheck, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { toggleReaction } from "@messaging/actions";
import { ALLOWED_EMOJIS } from "@messaging/emojis";
import { cn } from "@shared/utils";
import type { MessageDTO } from "@messaging/bus";

/**
 * Bulle de message + réactions + ticks de lecture. Les réactions sont
 * optimistic : l'UI se met à jour immédiatement au clic, le stream SSE
 * confirme ensuite (ou annule en cas d'erreur serveur, géré via toast).
 */
export function MessageBubble({
  message,
  mine,
  currentUserId,
  showReadReceipt,
}: {
  message: MessageDTO;
  mine: boolean;
  currentUserId: string;
  showReadReceipt: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleReact(emoji: string) {
    setPickerOpen(false);
    const res = await toggleReaction({ messageId: message.id, emoji });
    if (!res.success) {
      toast.error(res.error ?? "Réaction impossible.");
    }
  }

  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "group flex max-w-[80%] flex-col gap-1",
        mine ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div className="flex items-center gap-1">
        {!mine && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="invisible rounded-full border border-border bg-card p-1 text-muted-foreground shadow-sm transition hover:bg-muted group-hover:visible"
            aria-label="Réagir à ce message"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        )}
        <div
          className={cn(
            "relative whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
            mine
              ? "rounded-br-sm bg-coral-500 text-white"
              : "rounded-bl-sm bg-muted text-foreground"
          )}
        >
          {message.content}
          {message.editedAt && (
            <span
              className={cn(
                "ml-1 text-[10px] italic",
                mine ? "text-white/70" : "text-muted-foreground"
              )}
              title="Message modifié"
            >
              modifié
            </span>
          )}
        </div>
        {mine && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="invisible rounded-full border border-border bg-card p-1 text-muted-foreground shadow-sm transition hover:bg-muted group-hover:visible"
            aria-label="Réagir à ce message"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Reaction picker */}
      {pickerOpen && (
        <div className="flex gap-1 rounded-full border border-border bg-card p-1 shadow-md">
          {ALLOWED_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => handleReact(e)}
              className="rounded-full px-1.5 text-lg leading-none transition hover:scale-125 hover:bg-muted"
              aria-label={`Réagir avec ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Reaction bar (agrégée par emoji) */}
      {message.reactions.length > 0 && (
        <div className={cn("flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
          {message.reactions.map((r) => {
            const isMine = r.userIds.includes(currentUserId);
            return (
              <button
                key={r.emoji}
                type="button"
                onClick={() => handleReact(r.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                  isMine
                    ? "border-coral-300 bg-coral-50 text-coral-700"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
                title={`${r.count} réaction${r.count > 1 ? "s" : ""}`}
              >
                <span>{r.emoji}</span>
                <span className="tabular-nums">{r.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>{time}</span>
        {mine && showReadReceipt && (
          <span title={message.readAt ? `Lu à ${new Date(message.readAt).toLocaleTimeString("fr-FR")}` : "Envoyé"}>
            {message.readAt ? (
              <CheckCheck className="h-3 w-3 text-coral-500" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
