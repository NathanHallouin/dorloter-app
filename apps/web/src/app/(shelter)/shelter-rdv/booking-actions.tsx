"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@shared/ui/button";
import { updateBookingStatusAsShelter } from "@shelters/public.client";
import type { VisitBooking } from "@shelters/public";

interface Props {
  bookingId: string;
  currentStatus: VisitBooking["status"];
}

export function BookingActions({ bookingId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(
    status: "confirme" | "annule_par_refuge" | "honore" | "no_show",
    successMsg: string,
    confirmMsg?: string
  ) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    startTransition(async () => {
      const result = await updateBookingStatusAsShelter(bookingId, status);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  }

  if (currentStatus === "en_attente") {
    return (
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          onClick={() =>
            run("confirme", "RDV confirmé. L'adoptant sera notifié.")
          }
          disabled={isPending}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Confirmer
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            run(
              "annule_par_refuge",
              "RDV refusé.",
              "Refuser ce RDV ? L'adoptant sera notifié."
            )
          }
          disabled={isPending}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Refuser
        </Button>
      </div>
    );
  }

  if (currentStatus === "confirme") {
    return (
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => run("honore", "Marqué comme honoré.")}
          disabled={isPending}
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Marquer honoré
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            run("no_show", "Marqué comme non honoré.", "L'adoptant ne s'est pas présenté ?")
          }
          disabled={isPending}
        >
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          No-show
        </Button>
      </div>
    );
  }

  return null;
}
