"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  createShelterDocument,
  updateShelterDocument,
  deleteShelterDocument,
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
  formatBytes,
  type DocumentKind,
  type DocumentVisibility,
  type ShelterDocument,
} from "@shelters/public.client";

interface Props {
  initialDocuments: ShelterDocument[];
}

interface FormState {
  kind: DocumentKind;
  title: string;
  description: string;
  fileUrl: string;
  fileMimeType: string;
  fileSizeBytes: number;
  visibility: DocumentVisibility;
}

const EMPTY: FormState = {
  kind: "autre",
  title: "",
  description: "",
  fileUrl: "",
  fileMimeType: "",
  fileSizeBytes: 0,
  visibility: "internal",
};

export function DocumentsManager({ initialDocuments }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleCreate(form: FormState) {
    startTransition(async () => {
      const result = await createShelterDocument(form);
      if (!result.success) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      toast.success("Document ajouté.");
      setCreating(false);
      refresh();
    });
  }

  function handleUpdate(id: string, form: FormState) {
    startTransition(async () => {
      const result = await updateShelterDocument(id, form);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success("Document mis à jour.");
      setEditingId(null);
      refresh();
    });
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer « ${title} » ?`)) return;
    startTransition(async () => {
      const result = await deleteShelterDocument(id);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Document supprimé.");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      {creating ? (
        <DocumentEditor
          onCancel={() => setCreating(false)}
          onSave={handleCreate}
          isPending={isPending}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCreating(true)}
          disabled={initialDocuments.length >= 30}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un document
          {initialDocuments.length >= 30 && (
            <span className="ml-2 text-xs text-muted-foreground">
              (plafond atteint)
            </span>
          )}
        </Button>
      )}

      {initialDocuments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun document pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">
          {initialDocuments.map((d) =>
            editingId === d.id ? (
              <li key={d.id}>
                <DocumentEditor
                  initial={{
                    kind: d.kind,
                    title: d.title,
                    description: d.description ?? "",
                    fileUrl: d.fileUrl,
                    fileMimeType: d.fileMimeType ?? "",
                    fileSizeBytes: d.fileSizeBytes ?? 0,
                    visibility: d.visibility,
                  }}
                  onCancel={() => setEditingId(null)}
                  onSave={(form) => handleUpdate(d.id, form)}
                  isPending={isPending}
                />
              </li>
            ) : (
              <DocumentRow
                key={d.id}
                doc={d}
                onEdit={() => setEditingId(d.id)}
                onDelete={() => handleDelete(d.id, d.title)}
                disabled={isPending}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  onEdit,
  onDelete,
  disabled,
}: {
  doc: ShelterDocument;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <FileText className="h-5 w-5 shrink-0 text-coral-500" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold text-foreground">{doc.title}</span>
          <span className="inline-flex items-center rounded-full border border-border bg-sable-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {DOCUMENT_KIND_LABELS[doc.kind]}
          </span>
          {doc.visibility === "public" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral-700">
              <Eye className="h-3 w-3" />
              public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <EyeOff className="h-3 w-3" />
              interne
            </span>
          )}
        </div>
        {doc.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {doc.description}
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {doc.fileSizeBytes && formatBytes(doc.fileSizeBytes)}
          {doc.fileMimeType && doc.fileSizeBytes ? " · " : ""}
          {doc.fileMimeType}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-sable-100 hover:text-foreground"
          title="Ouvrir / télécharger"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
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
    </li>
  );
}

function DocumentEditor({
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/document", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Upload impossible.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        fileUrl: data.url,
        fileMimeType: data.mimeType ?? "",
        fileSizeBytes: data.sizeBytes ?? 0,
        title: prev.title || file.name.replace(/\.[^.]+$/, ""),
      }));
      toast.success("Fichier téléversé.");
    } catch (err) {
      console.error(err);
      toast.error("Upload échoué.");
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fileUrl) {
      toast.error("Téléversez d'abord un fichier.");
      return;
    }
    onSave({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-coral-300 bg-card p-4"
    >
      {form.fileUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-sable-50/40 p-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <FileText className="h-3.5 w-3.5 text-coral-500" />
            Fichier téléversé · {formatBytes(form.fileSizeBytes)} · {form.fileMimeType}
          </span>
          <div className="flex gap-1">
            <a
              href={form.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-coral-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Aperçu
            </a>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground"
            >
              Remplacer
            </button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          {uploading ? "Upload…" : "Téléverser un fichier (PDF, JPG, PNG, WebP, 10 Mo max)"}
        </Button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUpload(f);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="doc-kind">Catégorie</Label>
          <select
            id="doc-kind"
            value={form.kind}
            onChange={(e) =>
              set("kind", e.target.value as DocumentKind)
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-coral-500 focus-visible:ring-2 focus-visible:ring-coral-500/30"
          >
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doc-title">Titre *</Label>
          <Input
            id="doc-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={255}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="doc-desc">Description (optionnel)</Label>
        <Textarea
          id="doc-desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Précisez le contexte, la durée de validité, etc."
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Visibilité
        </legend>
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-2 text-sm has-[:checked]:border-coral-300 has-[:checked]:bg-coral-50">
          <input
            type="radio"
            name="doc-visibility"
            value="internal"
            checked={form.visibility === "internal"}
            onChange={() => set("visibility", "internal")}
            className="mt-1 h-3.5 w-3.5 accent-coral-500"
          />
          <span>
            <strong>Interne</strong> · réservé à votre équipe refuge
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-2 text-sm has-[:checked]:border-coral-300 has-[:checked]:bg-coral-50">
          <input
            type="radio"
            name="doc-visibility"
            value="public"
            checked={form.visibility === "public"}
            onChange={() => set("visibility", "public")}
            className="mt-1 h-3.5 w-3.5 accent-coral-500"
          />
          <span>
            <strong>Public</strong> · affiché sur votre fiche refuge, accessible
            à tous les visiteurs Dorloter
          </span>
        </label>
      </fieldset>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isPending || form.title.length < 2 || !form.fileUrl}
        >
          <Save className="mr-1 h-3.5 w-3.5" />
          {isPending
            ? "Enregistrement…"
            : initial
              ? "Enregistrer"
              : "Ajouter au refuge"}
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
