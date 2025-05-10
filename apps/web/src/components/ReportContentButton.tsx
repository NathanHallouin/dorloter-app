import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { moderationApi } from "@/api/moderation";
import { useAuth } from "@/auth/AuthContext";
import { Btn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { Field, Select, Textarea } from "@dorloter/ui";

const REASONS = ["Contenu inapproprié", "Arnaque suspectée", "Informations erronées", "Autre"];

/** Bouton « Signaler » réutilisable : alimente la file de modération (auth requise). */
export function ReportContentButton({ contentType, contentId }: { contentType: "pet" | "report" | "shelter" | "user"; contentId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () => moderationApi.submit(contentType, contentId, reason, comment || undefined),
    onSuccess: () => { setTimeout(() => setOpen(false), 1400); },
  });

  const onClick = () => { if (!user) { navigate("/login"); return; } setOpen(true); };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit.mutate(); };

  return (
    <>
      <Btn variant="ghost" size="sm" icon="flag" onClick={onClick}>Signaler</Btn>
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(12,22,16,.45)] p-6 backdrop-blur-[3px] [animation:dlFade_.12s_ease]">
          <div onClick={(e) => e.stopPropagation()} className="w-[min(440px,100%)] rounded-[10px] border border-line bg-card p-[22px] shadow-[0_30px_80px_rgba(0,0,0,.4)] [animation:dlPop_.18s_ease]">
            <div className="flex items-center justify-between">
              <h3 className="text-[20px] font-semibold text-foreground">Signaler ce contenu</h3>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-line bg-background text-muted-foreground"><Icon name="x" size={16} /></button>
            </div>
            {submit.isSuccess ? (
              <p className="mt-4 text-[14px] text-coral-600">Merci, votre signalement a été transmis à l'équipe. 🙏</p>
            ) : (
              <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3.5">
                <Field label="Motif"><Select value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS} /></Field>
                <Field label="Précisions (optionnel)"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Expliquez le problème…" /></Field>
                {submit.isError && <p className="text-[13px] text-brick-600">Envoi impossible.</p>}
                <div className="flex justify-end gap-2.5">
                  <Btn variant="ghost" onClick={() => setOpen(false)}>Annuler</Btn>
                  <Btn type="submit" icon="flag" disabled={submit.isPending}>{submit.isPending ? "Envoi…" : "Envoyer le signalement"}</Btn>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
