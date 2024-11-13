"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Link2, MessageCircle, Share2 } from "lucide-react";
import { Button, buttonVariants } from "@shared/ui/button";
import { cn } from "@shared/utils";

interface ReportShareProps {
  reportId: string;
  type: "perdu" | "trouve";
  petName: string | null;
  description: string;
  color: string | null;
  breed: string | null;
  address: string | null;
  dateEvent: string | Date;
  contactPhone: string | null;
  photoUrl?: string | null;
}

export function ReportShare({
  reportId,
  type,
  petName,
  description,
  color,
  breed,
  address,
  dateEvent,
  contactPhone,
  photoUrl,
}: ReportShareProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const url = useMemo(() => {
    // NEXT_PUBLIC_APP_URL est inlinée au build — même valeur côté serveur
    // et côté client, pas de mismatch d'hydration. Fallback sur
    // window.location.origin si la var n'est pas définie (edge case dev).
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${origin}/perdus-trouves/${reportId}`;
  }, [reportId]);

  const shareText = useMemo(
    () =>
      buildShareText({
        type,
        petName,
        description,
        color,
        breed,
        address,
        dateEvent,
        contactPhone,
        url,
      }),
    [type, petName, description, color, breed, address, dateEvent, contactPhone, url]
  );

  async function copyLink() {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({
          title:
            type === "perdu"
              ? `Animal perdu${petName ? ` · ${petName}` : ""}`
              : "Animal trouvé",
          text: description.slice(0, 140),
          url,
        });
        return;
      }
    } catch {
      // utilisateur a fermé, on copie
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Lien copié");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      toast.success(
        "Texte copié. Collez-le sur Facebook, PetAlert ou WhatsApp."
      );
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error("Impossible de copier le texte");
    }
  }

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}&quote=${encodeURIComponent(description.slice(0, 200))}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(
    type === "perdu"
      ? `🆘 Animal perdu${petName ? ` · ${petName}` : ""}${address ? ` à ${address}` : ""}`
      : `🐾 Animal trouvé${address ? ` à ${address}` : ""}`
  )}`;

  const channelClass = cn(
    buttonVariants({ variant: "outline", size: "lg" }),
    "h-auto flex-col gap-1.5 py-3 text-xs font-medium"
  );

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-coral-600" />
          <h2 className="text-sm font-semibold text-foreground">
            Aidez à diffuser
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Plus cette annonce circule, plus les chances{" "}
          {type === "perdu" ? "de retrouvailles" : "de rendre ce chat"}{" "}
          augmentent.
        </p>
      </div>

      {/* Copier le lien (action principale et rapide) */}
      <Button
        type="button"
        variant="outline"
        onClick={copyLink}
        className="mb-2 w-full gap-1.5"
      >
        {copiedLink ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            Lien copié
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            Copier le lien
          </>
        )}
      </Button>

      {/* Boutons réseaux — 3 colonnes uniformes */}
      <div className="grid grid-cols-3 gap-1.5">
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={channelClass}
          aria-label="Partager sur Facebook"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-[#1877F2]"
            aria-hidden
          >
            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
          </svg>
          Facebook
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={channelClass}
          aria-label="Partager sur WhatsApp"
        >
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          WhatsApp
        </a>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={channelClass}
          aria-label="Partager sur X (Twitter)"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-foreground"
            aria-hidden
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Twitter
        </a>
      </div>

      {/* Séparateur */}
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          ou
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Texte pré-formaté pour coller ailleurs (PetAlert, groupes FB…) */}
      <details className="group">
        <summary className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
          <span>Texte prêt à coller</span>
          <span className="text-xs text-muted-foreground group-open:hidden">
            voir
          </span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">
            masquer
          </span>
        </summary>

        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap bg-muted/30 p-3 font-sans text-xs leading-relaxed text-foreground">
            {shareText}
          </pre>
          <div className="border-t border-border bg-card p-2">
            <Button
              type="button"
              variant="default"
              onClick={copyText}
              className="w-full gap-1.5"
            >
              {copiedText ? (
                <>
                  <Check className="h-4 w-4" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier le texte
                </>
              )}
            </Button>
          </div>
        </div>
        {photoUrl && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Ajoutez aussi la photo à votre post ·{" "}
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              télécharger
            </a>
          </p>
        )}
      </details>
    </section>
  );
}

function buildShareText(args: {
  type: "perdu" | "trouve";
  petName: string | null;
  description: string;
  color: string | null;
  breed: string | null;
  address: string | null;
  dateEvent: string | Date;
  contactPhone: string | null;
  url: string;
}): string {
  const d =
    typeof args.dateEvent === "string"
      ? new Date(args.dateEvent)
      : args.dateEvent;
  const dateStr = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const lines: string[] = [];
  lines.push(
    args.type === "perdu"
      ? `🆘 CHAT PERDU${args.petName ? ` · ${args.petName.toUpperCase()}` : ""}`
      : "🐾 CHAT TROUVÉ"
  );
  lines.push("");
  if (args.address) {
    lines.push(`📍 ${args.address}`);
  }
  lines.push(`📅 ${args.type === "perdu" ? "Disparu" : "Trouvé"} le ${dateStr}`);
  lines.push("");

  const traits: string[] = [];
  if (args.color) traits.push(`Couleur : ${args.color}`);
  if (args.breed) traits.push(`Race : ${args.breed}`);
  if (traits.length > 0) {
    lines.push(traits.join(" · "));
    lines.push("");
  }

  lines.push(args.description.trim());
  lines.push("");

  if (args.contactPhone) {
    lines.push(`📞 Contact : ${args.contactPhone}`);
  }
  lines.push(`➡️ Fiche complète : ${args.url}`);
  lines.push("");
  lines.push("🙏 Merci de partager autour de vous.");

  return lines.join("\n");
}
