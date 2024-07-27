"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Share2 } from "lucide-react";
import { Button } from "@shared/ui/button";

export function ShareLinkButton({
  label,
  url,
  variant = "outline",
}: {
  label: string;
  url: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const absolute =
      typeof window !== "undefined" && url.startsWith("/")
        ? `${window.location.origin}${url}`
        : url;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: label, url: absolute });
        return;
      } catch {
        // l'utilisateur a fermé, on tombe sur le copy
      }
    }

    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success("Lien copié dans le presse-papier");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  return (
    <Button variant={variant} onClick={handleClick} className="gap-1.5">
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copié
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Partager
        </>
      )}
    </Button>
  );
}
