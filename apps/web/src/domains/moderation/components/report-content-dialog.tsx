"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flag, X } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import { reportContent } from "@moderation/actions";

type ContentType = "pet" | "report" | "shelter" | "user";

const REASONS: Record<ContentType, { value: string; label: string }[]> = {
  pet: [
    { value: "false_listing", label: "Fiche mensongère ou frauduleuse" },
    { value: "poor_conditions", label: "Conditions de détention suspectes" },
    { value: "inappropriate_photo", label: "Photo inappropriée" },
    { value: "spam", label: "Spam ou promotion" },
    { value: "other", label: "Autre" },
  ],
  report: [
    { value: "false_report", label: "Signalement faux ou trompeur" },
    { value: "inappropriate_photo", label: "Photo inappropriée" },
    { value: "spam", label: "Spam" },
    { value: "other", label: "Autre" },
  ],
  shelter: [
    { value: "fake_shelter", label: "Faux refuge / arnaque" },
    { value: "poor_conditions", label: "Conditions suspectes" },
    { value: "inappropriate", label: "Contenu inapproprié" },
    { value: "other", label: "Autre" },
  ],
  user: [
    { value: "harassment", label: "Harcèlement" },
    { value: "spam", label: "Spam" },
    { value: "fraud", label: "Arnaque" },
    { value: "other", label: "Autre" },
  ],
};

interface ReportContentDialogProps {
  contentType: ContentType;
  contentId: string;
  /** Label du trigger. Si omis, n'affiche qu'un icon button. */
  label?: string;
  size?: "sm" | "md";
}

export function ReportContentDialog({
  contentType,
  contentId,
  label,
  size = "md",
}: ReportContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[contentType][0]!.value);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const r = await reportContent({
      contentType,
      contentId,
      reason,
      comment: comment || undefined,
    });
    setPending(false);
    if (!r.success) {
      toast.error(r.error ?? "Impossible d'enregistrer le signalement.");
      return;
    }
    toast.success("Signalement transmis à l'équipe de modération.");
    setOpen(false);
    setComment("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-destructive ${
          size === "sm" ? "text-xs" : "text-sm"
        }`}
        aria-label="Signaler ce contenu"
      >
        <Flag className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {label ?? "Signaler"}
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
          <header className="flex items-start justify-between border-b border-border p-5">
            <div>
              <h2 className="text-lg font-semibold">Signaler ce contenu</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Notre équipe passera en revue votre signalement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="space-y-2">
              <Label>Motif</Label>
              <div className="space-y-1.5">
                {REASONS[contentType].map((r) => (
                  <label
                    key={r.value}
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm hover:bg-sable-50"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Précisions (optionnel)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ce qui vous dérange, des détails utiles à la modération…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
