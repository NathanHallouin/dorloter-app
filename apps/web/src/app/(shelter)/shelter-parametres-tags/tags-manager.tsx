"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import {
  createShelterTag,
  updateShelterTag,
  deleteShelterTag,
  TAG_COLORS,
  TAG_COLOR_CLASSES,
  TAG_COLOR_LABELS,
  type ShelterTag,
  type TagColor,
} from "@shelters/public.client";

interface Props {
  initialTags: ShelterTag[];
}

export function TagsManager({ initialTags }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleCreate(
    input: { name: string; color: TagColor; isPublic: boolean }
  ) {
    startTransition(async () => {
      const result = await createShelterTag(input);
      if (!result.success) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      toast.success("Étiquette créée.");
      setCreating(false);
      refresh();
    });
  }

  function handleUpdate(
    id: string,
    input: { name: string; color: TagColor; isPublic: boolean }
  ) {
    startTransition(async () => {
      const result = await updateShelterTag(id, input);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success("Étiquette mise à jour.");
      setEditingId(null);
      refresh();
    });
  }

  function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Supprimer l'étiquette « ${name} » ? Elle sera retirée de tous les animaux concernés.`
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteShelterTag(id);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Étiquette supprimée.");
      setTags((prev) => prev.filter((t) => t.id !== id));
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      {creating ? (
        <TagEditor
          onCancel={() => setCreating(false)}
          onSave={handleCreate}
          isPending={isPending}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCreating(true)}
          disabled={tags.length >= 10}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle étiquette
          {tags.length >= 10 && (
            <span className="ml-2 text-xs text-muted-foreground">
              (plafond atteint)
            </span>
          )}
        </Button>
      )}

      {tags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune étiquette pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">
          {tags.map((t) =>
            editingId === t.id ? (
              <li key={t.id}>
                <TagEditor
                  initial={t}
                  onCancel={() => setEditingId(null)}
                  onSave={(input) => handleUpdate(t.id, input)}
                  isPending={isPending}
                />
              </li>
            ) : (
              <TagRow
                key={t.id}
                tag={t}
                onEdit={() => setEditingId(t.id)}
                onDelete={() => handleDelete(t.id, t.name)}
                disabled={isPending}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}

function TagRow({
  tag,
  onEdit,
  onDelete,
  disabled,
}: {
  tag: ShelterTag;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const colors = TAG_COLOR_CLASSES[tag.color];
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {tag.name}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {tag.isPublic ? (
            <>
              <Eye className="h-3 w-3" />
              Visible côté public
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3" />
              Interne au refuge
            </>
          )}
        </span>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onEdit}
          disabled={disabled}
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onDelete}
          disabled={disabled}
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        </Button>
      </div>
    </li>
  );
}

function TagEditor({
  initial,
  onCancel,
  onSave,
  isPending,
}: {
  initial?: ShelterTag;
  onCancel: () => void;
  onSave: (input: {
    name: string;
    color: TagColor;
    isPublic: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<TagColor>(initial?.color ?? "coral");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);

  return (
    <div className="space-y-3 rounded-xl border border-coral-300 bg-card p-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nom (2 à 60 caractères)
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Urgent, Besoins FA, Comportement délicat..."
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Couleur
        </label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((c) => {
            const cl = TAG_COLOR_CLASSES[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                title={TAG_COLOR_LABELS[c]}
                className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition ${cl.bg} ${cl.text} ${color === c ? "border-foreground/40" : "border-transparent"}`}
              >
                {c === color && <Check className="h-3 w-3" />}
                {name.trim() || TAG_COLOR_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-coral-500"
        />
        Afficher cette étiquette sur la fiche publique de l&apos;animal
      </label>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => onSave({ name: name.trim(), color, isPublic })}
          disabled={isPending || name.trim().length < 2}
        >
          {isPending
            ? "Enregistrement…"
            : initial
              ? "Enregistrer"
              : "Créer"}
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
    </div>
  );
}
