"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import { sponsorPet, unsponsorPet } from "../actions/sponsorships";

interface Props {
  petId: string;
  petName: string;
  initialIsSponsor: boolean;
  initialCount: number;
  initialMessage?: string | null;
  isSignedIn: boolean;
}

export function SponsorButton({
  petId,
  petName,
  initialIsSponsor,
  initialCount,
  initialMessage = null,
  isSignedIn,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSponsor, setIsSponsor] = useState(initialIsSponsor);
  const [count, setCount] = useState(initialCount);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSponsor() {
    startTransition(async () => {
      const result = await sponsorPet({ petId, message });
      if (!result.success) {
        toast.error(result.error ?? "Parrainage impossible.");
        return;
      }
      toast.success(`Vous parrainez ${petName} symboliquement.`);
      if (!isSponsor) {
        setCount((c) => c + 1);
        setIsSponsor(true);
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleUnsponsor() {
    if (!confirm(`Retirer votre parrainage de ${petName} ?`)) return;
    startTransition(async () => {
      const result = await unsponsorPet(petId);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success("Parrainage retiré.");
      setCount((c) => Math.max(0, c - 1));
      setIsSponsor(false);
      setOpen(false);
      router.refresh();
    });
  }

  if (!isSignedIn) {
    return (
      <a
        href={`/login?callbackUrl=${encodeURIComponent(`/adopter/${petId}`)}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-coral-300 bg-coral-50 px-3 py-1.5 text-xs font-semibold text-coral-700 hover:bg-coral-100"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Parrainer {count > 0 && <span className="tabular-nums">({count})</span>}
      </a>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          isSponsor
            ? "border border-coral-500 bg-coral-500 text-white hover:bg-coral-600"
            : "border border-coral-300 bg-coral-50 text-coral-700 hover:bg-coral-100"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isSponsor ? "Parrain" : "Parrainer"}
        {count > 0 && (
          <span className="tabular-nums">
            ({count})
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-coral-300 bg-card p-4 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            {isSponsor
              ? `Vous parrainez ${petName}`
              : `Parrainer ${petName} symboliquement`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Pas de flux financier. Vous suivez l&apos;animal, recevez les
            updates du refuge et soutenez sa visibilité.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder={`Un mot pour ${petName} (optionnel, visible par le refuge)…`}
        />
        <p className="text-[10px] text-muted-foreground">
          {message.length} / 280
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSponsor}
          disabled={isPending}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          {isPending
            ? "Enregistrement…"
            : isSponsor
              ? "Mettre à jour"
              : "Devenir parrain"}
        </Button>
        {isSponsor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUnsponsor}
            disabled={isPending}
          >
            Retirer le parrainage
          </Button>
        )}
      </div>
    </div>
  );
}
