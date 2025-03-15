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
  MapPin,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  createShelterEvent,
  updateShelterEvent,
  deleteShelterEvent,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_CLASSES,
  type ShelterEvent,
  type ShelterEventType,
} from "@shelters/public.client";

interface Props {
  initialEvents: ShelterEvent[];
}

interface FormState {
  type: ShelterEventType;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venueAddress: string;
  externalUrl: string;
  isPublished: boolean;
}

function toLocalInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

const EMPTY: FormState = {
  type: "portes_ouvertes",
  title: "",
  description: "",
  startsAt: toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  endsAt: "",
  venueAddress: "",
  externalUrl: "",
  isPublished: true,
};

export function EventsManager({ initialEvents }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleCreate(form: FormState) {
    startTransition(async () => {
      const result = await createShelterEvent(form);
      if (!result.success) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      toast.success("Événement créé.");
      setCreating(false);
      refresh();
    });
  }

  function handleUpdate(id: string, form: FormState) {
    startTransition(async () => {
      const result = await updateShelterEvent(id, form);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success("Événement mis à jour.");
      setEditingId(null);
      refresh();
    });
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer « ${title} » ?`)) return;
    startTransition(async () => {
      const result = await deleteShelterEvent(id);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Événement supprimé.");
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
          Nouvel événement
        </Button>
      )}

      {initialEvents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun événement programmé.
        </p>
      ) : (
        <ul className="space-y-3">
          {initialEvents.map((e) =>
            editingId === e.id ? (
              <li key={e.id}>
                <EventEditor
                  initial={{
                    type: e.type,
                    title: e.title,
                    description: e.description ?? "",
                    startsAt: toLocalInput(e.startsAt),
                    endsAt: e.endsAt ? toLocalInput(e.endsAt) : "",
                    venueAddress: e.venueAddress ?? "",
                    externalUrl: e.externalUrl ?? "",
                    isPublished: e.isPublished,
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
        </ul>
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
  event: ShelterEvent;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const cl = EVENT_TYPE_CLASSES[event.type];
  const isPast = new Date(event.startsAt).getTime() < Date.now();
  return (
    <li
      className={`rounded-xl border border-border bg-card p-4 ${
        isPast ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text} ${cl.border}`}
            >
              {EVENT_TYPE_LABELS[event.type]}
            </span>
            {!event.isPublished && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <EyeOff className="h-3 w-3" />
                brouillon
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                passé
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {event.title}
          </h3>
          <p className="mt-1 inline-flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(event.startsAt).toLocaleString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {event.endsAt && (
                <>
                  {" → "}
                  {new Date(event.endsAt).toLocaleString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </span>
            {event.venueAddress && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.venueAddress}
              </span>
            )}
            {event.externalUrl && (
              <a
                href={event.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-coral-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Lien
              </a>
            )}
          </p>
          {event.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
              {event.description}
            </p>
          )}
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
  const [form, setForm] = useState<FormState>(initial ?? EMPTY);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      venueAddress: form.venueAddress.trim(),
      externalUrl: form.externalUrl.trim(),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-coral-300 bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="ev-type">Type</Label>
          <select
            id="ev-type"
            value={form.type}
            onChange={(e) =>
              set("type", e.target.value as ShelterEventType)
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-coral-500 focus-visible:ring-2 focus-visible:ring-coral-500/30"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
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
            placeholder="Portes ouvertes, collecte de croquettes…"
            maxLength={255}
            required
            autoFocus
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-start">Début *</Label>
          <Input
            id="ev-start"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-end">Fin (optionnel)</Label>
          <Input
            id="ev-end"
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            min={form.startsAt}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-venue">
          Lieu (si différent du refuge, optionnel)
        </Label>
        <Input
          id="ev-venue"
          value={form.venueAddress}
          onChange={(e) => set("venueAddress", e.target.value)}
          placeholder="Salle des fêtes, 14 rue de la République, Lyon"
          maxLength={500}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-url">URL externe (optionnel)</Label>
        <Input
          id="ev-url"
          type="url"
          value={form.externalUrl}
          onChange={(e) => set("externalUrl", e.target.value)}
          placeholder="Inscription HelloAsso, page Facebook…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-desc">Description (optionnel)</Label>
        <Textarea
          id="ev-desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Détails, horaires précis, animaux à rencontrer…"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => set("isPublished", e.target.checked)}
          className="h-4 w-4 rounded border-border accent-coral-500"
        />
        <Eye className="h-3.5 w-3.5 text-coral-600" />
        Publier (visible sur la page publique des événements)
      </label>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isPending || form.title.length < 2}
        >
          <Save className="mr-1 h-3.5 w-3.5" />
          {isPending
            ? "Enregistrement…"
            : initial
              ? "Enregistrer"
              : "Créer l'événement"}
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
