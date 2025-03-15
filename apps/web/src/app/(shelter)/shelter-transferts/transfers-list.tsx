"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Calendar,
  Check,
  MessageSquare,
  PawPrint,
  X,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import {
  acceptTransfer,
  cancelTransfer,
  declineTransfer,
  TRANSFER_STATUS_CLASSES,
  TRANSFER_STATUS_LABELS,
  type PetTransferWithContext,
} from "@adoption/public.client";

interface Props {
  currentShelterId: string;
  inbound: PetTransferWithContext[];
  outbound: PetTransferWithContext[];
}

export function TransfersList({ currentShelterId, inbound, outbound }: Props) {
  const inboundPending = inbound.filter((t) => t.status === "en_attente");
  const inboundOther = inbound.filter((t) => t.status !== "en_attente");
  const outboundPending = outbound.filter((t) => t.status === "en_attente");
  const outboundOther = outbound.filter((t) => t.status !== "en_attente");

  return (
    <div className="space-y-8">
      {inboundPending.length > 0 && (
        <section>
          <SectionTitle title="Demandes entrantes à traiter" tone="coral" />
          <ul className="space-y-3">
            {inboundPending.map((t) => (
              <InboundRow
                key={t.id}
                transfer={t}
                currentShelterId={currentShelterId}
                showActions
              />
            ))}
          </ul>
        </section>
      )}

      {outboundPending.length > 0 && (
        <section>
          <SectionTitle title="Vos demandes sortantes en attente" tone="default" />
          <ul className="space-y-3">
            {outboundPending.map((t) => (
              <OutboundRow
                key={t.id}
                transfer={t}
                currentShelterId={currentShelterId}
                showActions
              />
            ))}
          </ul>
        </section>
      )}

      {(inboundOther.length > 0 || outboundOther.length > 0) && (
        <section>
          <SectionTitle title="Historique" tone="muted" />
          <ul className="space-y-2">
            {[...inboundOther, ...outboundOther]
              .sort(
                (a, b) =>
                  new Date(b.requestedAt).getTime() -
                  new Date(a.requestedAt).getTime()
              )
              .map((t) => {
                const isInbound = t.toShelterId === currentShelterId;
                return isInbound ? (
                  <InboundRow
                    key={t.id}
                    transfer={t}
                    currentShelterId={currentShelterId}
                    compact
                  />
                ) : (
                  <OutboundRow
                    key={t.id}
                    transfer={t}
                    currentShelterId={currentShelterId}
                    compact
                  />
                );
              })}
          </ul>
        </section>
      )}

      {inbound.length === 0 && outbound.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun transfert pour le moment. Vous pouvez en initier un depuis la
          fiche d&apos;un animal.
        </p>
      )}
    </div>
  );
}

function SectionTitle({
  title,
  tone,
}: {
  title: string;
  tone: "coral" | "default" | "muted";
}) {
  const colors = {
    coral: "text-coral-700",
    default: "text-foreground",
    muted: "text-muted-foreground",
  };
  return (
    <h2
      className={`mb-3 text-sm font-semibold uppercase tracking-wider ${colors[tone]}`}
    >
      {title}
    </h2>
  );
}

function TransferHeader({
  transfer,
}: {
  transfer: PetTransferWithContext;
}) {
  const cl = TRANSFER_STATUS_CLASSES[transfer.status];
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
      >
        {TRANSFER_STATUS_LABELS[transfer.status]}
      </span>
      <Link
        href={`/adopter/${transfer.petId}`}
        className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-coral-600"
      >
        <PawPrint className="h-3.5 w-3.5" />
        {transfer.petName}
      </Link>
      <span className="text-xs text-muted-foreground">
        ({transfer.petSpecies === "chat" ? "chat" : "chien"})
      </span>
    </div>
  );
}

function TransferRoute({
  transfer,
}: {
  transfer: PetTransferWithContext;
}) {
  return (
    <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        {transfer.fromShelterName}
      </span>
      <ArrowRight className="h-3 w-3" />
      <span className="font-medium text-foreground">
        {transfer.toShelterName}
      </span>
      <span aria-hidden="true">·</span>
      <Calendar className="h-3 w-3" />
      {new Date(transfer.requestedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
    </p>
  );
}

function InboundRow({
  transfer,
  currentShelterId,
  showActions,
  compact,
}: {
  transfer: PetTransferWithContext;
  currentShelterId: string;
  showActions?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "accept" | "decline">("idle");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptTransfer({
        transferId: transfer.id,
        decisionNote: note,
      });
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success(
        `${transfer.petName} est désormais sous votre responsabilité.`
      );
      router.refresh();
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineTransfer({
        transferId: transfer.id,
        decisionNote: note,
      });
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("Transfert refusé.");
      router.refresh();
    });
  }

  return (
    <li
      id={transfer.id}
      className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}
    >
      <TransferHeader transfer={transfer} />
      <TransferRoute transfer={transfer} />
      {!compact && transfer.message && (
        <p className="mt-2 inline-flex items-start gap-2 rounded-md border border-border bg-sable-50/40 p-2.5 text-xs text-foreground">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-coral-500" />
          <span className="whitespace-pre-wrap">{transfer.message}</span>
        </p>
      )}
      {!compact && transfer.decisionNote && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Décision : {transfer.decisionNote}
        </p>
      )}

      {showActions && transfer.status === "en_attente" && (
        <>
          {mode === "idle" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setMode("accept")}
                disabled={isPending}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Accepter
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMode("decline")}
                disabled={isPending}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Refuser
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
              <label className="block text-xs font-semibold text-muted-foreground">
                Note (optionnelle)
              </label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === "accept"
                    ? "Conditions de prise en charge, date d'arrivée, etc."
                    : "Motif du refus (manque de place, profil non adapté…)"
                }
                maxLength={2000}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={mode === "accept" ? handleAccept : handleDecline}
                  disabled={isPending}
                >
                  Confirmer{" "}
                  {mode === "accept" ? "l'acceptation" : "le refus"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMode("idle");
                    setNote("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

function OutboundRow({
  transfer,
  currentShelterId,
  showActions,
  compact,
}: {
  transfer: PetTransferWithContext;
  currentShelterId: string;
  showActions?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm(`Annuler la demande de transfert pour ${transfer.petName} ?`))
      return;
    startTransition(async () => {
      const result = await cancelTransfer(transfer.id);
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("Demande annulée.");
      router.refresh();
    });
  }

  return (
    <li
      id={transfer.id}
      className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}
    >
      <TransferHeader transfer={transfer} />
      <TransferRoute transfer={transfer} />
      {!compact && transfer.message && (
        <p className="mt-2 inline-flex items-start gap-2 rounded-md border border-border bg-sable-50/40 p-2.5 text-xs text-foreground">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-coral-500" />
          <span className="whitespace-pre-wrap">{transfer.message}</span>
        </p>
      )}
      {!compact && transfer.decisionNote && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Décision : {transfer.decisionNote}
        </p>
      )}
      {showActions && transfer.status === "en_attente" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
          className="mt-3"
        >
          Annuler la demande
        </Button>
      )}
    </li>
  );
}
