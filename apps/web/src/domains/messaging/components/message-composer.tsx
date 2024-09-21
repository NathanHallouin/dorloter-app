"use client";

import { useCallback, useRef, useState } from "react";
import { FileImage, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { sendMessage, setTyping } from "@messaging/actions";
import { GifPickerTrigger, type SelectedGif } from "./gif-picker";
import { VoiceRecorder, type VoiceUpload } from "./voice-recorder";

/**
 * Compositeur de message : textarea auto-resize, send via Ctrl+Entrée,
 * debounce du typing indicator, honeypot caché.
 */
export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingIdle = useRef<number | null>(null);
  const lastTyping = useRef<number>(0);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  // Debounce typing : on envoie typing=true max 1×/3s, et typing=false 3s
  // après le dernier keystroke.
  function notifyTypingStart() {
    const now = Date.now();
    if (now - lastTyping.current > 3000) {
      void setTyping(conversationId, true);
      lastTyping.current = now;
    }
    if (typingIdle.current) window.clearTimeout(typingIdle.current);
    typingIdle.current = window.setTimeout(() => {
      void setTyping(conversationId, false);
      lastTyping.current = 0;
    }, 3000);
  }

  async function handleSend() {
    const content = value.trim();
    if (content.length < 1) return;
    if (content.length > 2000) {
      toast.error("Message trop long (2000 caractères max).");
      return;
    }

    setSending(true);
    const res = await sendMessage({ conversationId, content });
    setSending(false);

    if (!res.success) {
      toast.error(res.error ?? "Impossible d'envoyer le message.");
      return;
    }
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (typingIdle.current) {
      window.clearTimeout(typingIdle.current);
      void setTyping(conversationId, false);
    }
  }

  async function handleGifSelected(gif: SelectedGif) {
    setSending(true);
    const res = await sendMessage({
      conversationId,
      attachment: {
        type: "gif",
        url: gif.url,
        meta: {
          type: "gif",
          provider: "tenor",
          externalId: gif.externalId,
          width: gif.width,
          height: gif.height,
          previewUrl: gif.previewUrl,
        },
      },
    });
    setSending(false);
    if (!res.success) {
      toast.error(res.error ?? "Impossible d'envoyer le GIF.");
    }
  }

  async function handleVoiceUploaded(voice: VoiceUpload) {
    const res = await sendMessage({
      conversationId,
      attachment: {
        type: "voice",
        url: voice.url,
        meta: {
          type: "voice",
          durationMs: voice.durationMs,
          mimeType: voice.mimeType,
        },
      },
    });
    if (!res.success) {
      toast.error(res.error ?? "Impossible d'envoyer le message vocal.");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSend();
    }
  }

  const over = value.length > 2000;
  const remaining = 2000 - value.length;

  return (
    <div className="sticky bottom-0 border-t border-border bg-card px-3 py-2">
      {/* Honeypot anti-bot */}
      <input
        type="text"
        name="_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        style={{ position: "absolute", left: "-9999px", width: 0, height: 0 }}
      />
      <div className="flex items-end gap-2">
        <GifPickerTrigger onSelect={handleGifSelected}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={sending}
            aria-label="Choisir un GIF"
          >
            <FileImage className="h-4 w-4 text-coral-500" />
          </Button>
        </GifPickerTrigger>
        <VoiceRecorder
          disabled={sending}
          onUploaded={handleVoiceUploaded}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autoResize();
            notifyTypingStart();
          }}
          onKeyDown={onKeyDown}
          placeholder="Écrire un message… (Ctrl+Entrée pour envoyer)"
          rows={1}
          disabled={sending}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors focus:border-coral-400 focus:ring-2 focus:ring-coral-200/50 disabled:opacity-50"
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={sending || over || value.trim().length === 0}
          size="icon"
          aria-label="Envoyer"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {remaining < 200 && (
        <p
          className={`mt-1 text-right text-[10px] tabular-nums ${
            over ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {remaining}
        </p>
      )}
    </div>
  );
}
