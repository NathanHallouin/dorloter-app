"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar } from "lucide-react";
import { Button } from "@shared/ui/button";
import {
  cancelMySignup,
  SHIFT_SIGNUP_STATUS_LABELS,
  type ShiftSignupWithContext,
} from "@shelters/public.client";

interface Props {
  signups: ShiftSignupWithContext[];
}

export function MyPlanningActions({ signups }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function leave(id: string, title: string) {
    if (!confirm(`Annuler votre inscription au créneau "${title}" ?`)) return;
    startTransition(async () => {
      const r = await cancelMySignup(id);
      if (!r.success) {
        toast.error(r.error ?? "Désinscription impossible.");
        return;
      }
      toast.success("Désinscription enregistrée.");
      router.refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {signups.map((s) => (
        <li
          key={s.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{s.shiftTitle}</h3>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDateTime(s.shiftStartsAt)} → {formatTime(s.shiftEndsAt)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Statut : {SHIFT_SIGNUP_STATUS_LABELS[s.status]}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => leave(s.id, s.shiftTitle)}
            disabled={isPending}
          >
            Annuler
          </Button>
        </li>
      ))}
    </ul>
  );
}

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
