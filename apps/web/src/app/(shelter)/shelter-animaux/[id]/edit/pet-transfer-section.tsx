"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, BadgeCheck } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import {
  initiateTransfer,
  TRANSFER_STATUS_CLASSES,
  TRANSFER_STATUS_LABELS,
  type PetTransfer,
} from "@adoption/public.client";

interface TargetShelter {
  id: string;
  name: string;
  isVerified: boolean;
}

interface Props {
  petId: string;
  petName: string;
  targets: TargetShelter[];
  history: PetTransfer[];
  hasPending: boolean;
}

export function PetTransferSection({
  petId,
  petName,
  targets,
  history,
  hasPending,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toShelterId, setToShelterId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toShelterId) {
      toast.error("Sélectionnez un refuge destinataire.");
      return;
    }
    startTransition(async () => {
      const result = await initiateTransfer({
        petId,
        toShelterId,
        message,
      });
      if (!result.success) {
        toast.error(result.error ?? "Demande impossible.");
        return;
      }
      toast.success(
        `Demande de transfert envoyée. Le refuge cible sera notifié par email.`
      );
      setOpen(false);
      setToShelterId("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <ArrowLeftRight className="h-4 w-4 text-coral-500" />
            Transfert vers un autre refuge
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Proposez la prise en charge de {petName} à un refuge partenaire. À
            l&apos;acceptation, la fiche bascule automatiquement.
          </p>
        </div>
        {!hasPending && !open && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            Demander un transfert
          </Button>
        )}
        {hasPending && (
          <Link
            href="/shelter-transferts"
            className="text-xs font-medium text-coral-600 hover:underline"
          >
            Voir la demande en cours
          </Link>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="transfer-target"
              className="mb-1 block text-xs font-semibold text-muted-foreground"
            >
              Refuge destinataire
            </label>
            <select
              id="transfer-target"
              value={toShelterId}
              onChange={(e) => setToShelterId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              required
            >
              <option value="">Choisir un refuge…</option>
              {targets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isVerified ? " (vérifié)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="transfer-message"
              className="mb-1 block text-xs font-semibold text-muted-foreground"
            >
              Message (contexte, motif)
            </label>
            <Textarea
              id="transfer-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explique pourquoi tu sollicites ce refuge, l'urgence éventuelle, les besoins particuliers…"
              maxLength={2000}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              Envoyer la demande
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setMessage("");
                setToShelterId("");
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}

      {history.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Historique de transferts
          </h3>
          <ul className="space-y-1.5 text-xs">
            {history.map((t) => {
              const cl = TRANSFER_STATUS_CLASSES[t.status];
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 text-muted-foreground"
                >
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
                  >
                    {TRANSFER_STATUS_LABELS[t.status]}
                  </span>
                  <span>
                    {new Date(t.requestedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {t.decidedAt && (
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3" />
                      décision le{" "}
                      {new Date(t.decidedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
