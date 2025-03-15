"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, MapPin } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import {
  createVisitBooking,
  formatMinutes,
} from "@shelters/public.client";

interface DayGroup {
  dateISO: string;
  dateLabel: string;
  slots: Array<{
    startMinutes: number;
    scheduledFor: string;
    isAvailable: boolean;
  }>;
}

interface BookingPickerProps {
  shelterId: string;
  shelterName: string;
  shelterAddress: string | null;
  petId: string;
  petName: string;
  days: DayGroup[];
}

export function BookingPicker({
  shelterId,
  shelterName,
  shelterAddress,
  petId,
  petName,
  days,
}: BookingPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!selected) return;
    startTransition(async () => {
      const result = await createVisitBooking({
        shelterId,
        petId,
        scheduledFor: selected,
        userNotes: notes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "Réservation impossible.");
        return;
      }
      toast.success(
        "Demande envoyée. Le refuge va vous confirmer par email."
      );
      router.push("/dashboard?tab=rdv");
    });
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {days.map((d) => (
          <li
            key={d.dateISO}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Calendar className="h-3.5 w-3.5 text-coral-500" />
              {d.dateLabel}
            </p>
            <ul className="flex flex-wrap gap-2">
              {d.slots.map((s) => {
                const id = s.scheduledFor;
                const isSelected = selected === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() =>
                        s.isAvailable
                          ? setSelected(isSelected ? null : id)
                          : undefined
                      }
                      disabled={!s.isAvailable || isPending}
                      aria-pressed={isSelected}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium tabular-nums transition ${
                        !s.isAvailable
                          ? "cursor-not-allowed border-border bg-sable-50 text-muted-foreground/60 line-through"
                          : isSelected
                            ? "border-coral-500 bg-coral-500 text-white"
                            : "border-border bg-white text-foreground hover:border-coral-300 hover:bg-coral-50"
                      }`}
                    >
                      {formatMinutes(s.startMinutes)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="space-y-4 rounded-2xl border border-coral-200 bg-coral-50/40 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-coral-700">
              Récapitulatif
            </p>
            <p className="mt-1 text-sm text-foreground">
              Visite de <strong>{petName}</strong> chez{" "}
              <strong>{shelterName}</strong> le{" "}
              <strong>
                {new Date(selected).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                à{" "}
                {new Date(selected).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
              .
            </p>
            {shelterAddress && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {shelterAddress}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="rdv-notes"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Notes pour le refuge (optionnel)
            </label>
            <Textarea
              id="rdv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Quelques mots sur votre situation, vos questions, ou ce qui vous a séduit dans le profil."
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {notes.length} / 1000
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Envoi…" : "Envoyer la demande"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(null)}
              disabled={isPending}
            >
              Choisir un autre créneau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
