"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import { openConversation } from "@messaging/actions";

/**
 * Bouton "Poser une question au refuge" / "Contacter le refuge".
 * Ouvre une modale avec un textarea préfilable. À la soumission, crée ou
 * récupère la conversation et redirige vers le thread.
 *
 * Si l'utilisateur n'est pas connecté, le bouton redirige vers /login.
 */
export function ContactShelterButton({
  shelterId,
  shelterName,
  petId,
  petName,
  variant = "default",
  label,
}: {
  shelterId: string;
  shelterName: string;
  petId?: string;
  petName?: string;
  variant?: "default" | "outline" | "secondary";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    petName
      ? `Bonjour, je suis intéressé(e) par ${petName}. `
      : ""
  );
  const [pending, start] = useTransition();

  function handleOpen() {
    setOpen(true);
  }

  function handleSend() {
    const firstMessage = value.trim();
    if (firstMessage.length < 10) {
      toast.error("Écrivez au moins 10 caractères.");
      return;
    }
    start(async () => {
      const res = await openConversation({
        shelterId,
        petId,
        firstMessage,
      });
      if (!res.success || !res.data) {
        if (res.error?.toLowerCase().includes("non autoris")) {
          // Redirige vers login avec callback
          const next = petId ? `/adopter/${petId}` : `/refuges/${shelterId}`;
          router.push(`/login?callbackUrl=${encodeURIComponent(next)}`);
          return;
        }
        toast.error(res.error ?? "Impossible d'ouvrir la conversation.");
        return;
      }
      toast.success("Message envoyé. Le refuge répondra bientôt.");
      router.push(`/messages/${res.data.conversationId}`);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        onClick={handleOpen}
        className="gap-1.5"
      >
        <MessageCircle className="h-4 w-4" />
        {label ?? (petName ? "Poser une question" : "Contacter ce refuge")}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">
              Écrire à {shelterName}
              {petName ? ` · à propos de ${petName}` : ""}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Le refuge recevra une notification et pourra vous répondre dans
              votre espace messages.
            </p>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Votre question ou message…"
              rows={6}
              maxLength={2000}
              className="mt-4 resize-none"
              autoFocus
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {value.length}/2000
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSend}
                disabled={pending || value.trim().length < 10}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                {pending ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
