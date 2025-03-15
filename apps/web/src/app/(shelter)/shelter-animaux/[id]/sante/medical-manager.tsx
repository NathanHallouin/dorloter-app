"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Calendar,
  Bell,
  Stethoscope,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  createMedicalEvent,
  updateMedicalEvent,
  deleteMedicalEvent,
  MEDICAL_EVENT_TYPES,
  MEDICAL_EVENT_LABELS,
  MEDICAL_EVENT_COLOR_CLASSES,
  type MedicalEvent,
  type MedicalEventType,
} from "@adoption/public";

interface SerializedEvent extends MedicalEvent {
  typeLabel: string;
  colorClasses: (typeof MEDICAL_EVENT_COLOR_CLASSES)[MedicalEventType];
}

interface Props {
  petId: string;
  petName: string;
  initialEvents: SerializedEvent[];
}

interface FormState {
  type: MedicalEventType;
  title: string;
  eventDate: string;
  nextReminderAt: string;
  vetNameFreeform: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  type: "vaccin",
  title: "",
  eventDate: new Date().toISOString().slice(0, 10),
  nextReminderAt: "",
  vetNameFreeform: "",
  notes: "",
};

export function MedicalManager({ petId, initialEvents }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleCreate(form: FormState) {
    startTransition(async () => {
      const result = await createMedicalEvent({ petId, ...form });
      if (!result.success) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      toast.success("Évènement ajouté au carnet.");
      setCreating(false);
      refresh();
    });
  }

  function handleUpdate(id: string, form: FormState) {
    startTransition(async () => {
      const result = await updateMedicalEvent(id, { petId, ...form });
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success("Évènement mis à jour.");
      setEditingId(null);
      refresh();
    });
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer « ${title} » du carnet médical ?`)) return;
    startTransition(async () => {
      const result = await deleteMedicalEvent(id, petId);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Évènement supprimé.");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      {creating ? (
        <EventEditor
          onCancel={() => setCreating(false)}
          onSave={handleCreate}
          isPending={isPending}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCreating(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un évènement
        </Button>
      )}

      {initialEvents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun évènement médical enregistré pour le moment.
        </p>
      ) : (
        <ol className="space-y-3">
          {initialEvents.map((e) =>
            editingId === e.id ? (
              <li key={e.id}>
                <EventEditor
                  initial={{
                    type: e.type,
                    title: e.title,
                    eventDate: e.eventDate,
                    nextReminderAt: e.nextReminderAt ?? "",
                    vetNameFreeform: e.vetNameFreeform ?? "",
                    notes: e.notes ?? "",
                  }}
                  onCancel={() => setEditingId(null)}
                  onSave={(form) => handleUpdate(e.id, form)}
                  isPending={isPending}
                />
              </li>
            ) : (
              <EventRow
                key={e.id}
                event={e}
                onEdit={() => setEditingId(e.id)}
                onDelete={() => handleDelete(e.id, e.title)}
                disabled={isPending}
              />
            )
          )}
        </ol>
      )}
    </div>
  );
}

function EventRow({
  event,
  onEdit,
  onDelete,
  disabled,
}: {
  event: SerializedEvent;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const c = event.colorClasses;
  const eventDate = new Date(event.eventDate);
  const eventDateLabel = eventDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const reminderLabel = event.nextReminderAt
    ? new Date(event.nextReminderAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const isReminderSoon =
    event.nextReminderAt &&
    new Date(event.nextReminderAt).getTime() <
      Date.now() + 30 * 24 * 60 * 60 * 1000;

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-1 items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {event.title}
              </h3>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text} ${c.border}`}
              >
                {event.typeLabel}
              </span>
            </div>
            <p className="mt-1 inline-flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {eventDateLabel}
              </span>
              {event.vetNameFreeform && (
                <span className="inline-flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {event.vetNameFreeform}
                </span>
              )}
              {reminderLabel && (
                <span
                  className={`inline-flex items-center gap-1 ${
                    isReminderSoon ? "text-coral-700" : ""
                  }`}
                >
                  <Bell className="h-3 w-3" />
                  Rappel : {reminderLabel}
                </span>
              )}
            </p>
            {event.notes && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                {event.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onEdit}
            disabled={disabled}
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={disabled}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function EventEditor({
  initial,
  onCancel,
  onSave,
  isPending,
}: {
  initial?: FormState;
  onCancel: () => void;
  onSave: (form: FormState) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      title: form.title.trim(),
      notes: form.notes.trim(),
      vetNameFreeform: form.vetNameFreeform.trim(),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-coral-300 bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="ev-type">Type</Label>
          <select
            id="ev-type"
            value={form.type}
            onChange={(e) => set("type", e.target.value as MedicalEventType)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-coral-500 focus-visible:ring-2 focus-visible:ring-coral-500/30"
          >
            {MEDICAL_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEDICAL_EVENT_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-title">Titre *</Label>
          <Input
            id="ev-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Rappel CHPPI, Vermifuge Drontal, Stérilisation…"
            maxLength={255}
            required
            autoFocus
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-date">Date de l&apos;évènement *</Label>
          <Input
            id="ev-date"
            type="date"
            value={form.eventDate}
            onChange={(e) => set("eventDate", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-reminder">Prochain rappel (optionnel)</Label>
          <Input
            id="ev-reminder"
            type="date"
            value={form.nextReminderAt}
            onChange={(e) => set("nextReminderAt", e.target.value)}
            min={form.eventDate}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-vet">Vétérinaire (optionnel)</Label>
        <Input
          id="ev-vet"
          value={form.vetNameFreeform}
          onChange={(e) => set("vetNameFreeform", e.target.value)}
          placeholder="Dr. Lemoine, Clinique des Lilas…"
          maxLength={255}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-notes">Notes (optionnel)</Label>
        <Textarea
          id="ev-notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Observations, réactions, traitements en cours…"
        />
        <p className="text-[11px] text-muted-foreground">
          {form.notes.length} / 2000
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || form.title.length < 2}>
          <Save className="mr-1 h-3.5 w-3.5" />
          {isPending ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Annuler
        </Button>
      </div>
    </form>
  );
}
