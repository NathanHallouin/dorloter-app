"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "@shared/ui/button";
import { deleteTemplate } from "@shelters/public.client";
import type { ResponseTemplate } from "@shelters/public";
import { TemplateEditor } from "./template-editor";

export function TemplateRow({ template }: { template: ResponseTemplate }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `Supprimer le template "${template.name}" ? Cette action est définitive.`
      )
    ) {
      return;
    }
    startDelete(async () => {
      const result = await deleteTemplate(template.id);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Template supprimé.");
      router.refresh();
    });
  }

  function handleCopy() {
    void navigator.clipboard
      .writeText(template.body)
      .then(() => toast.success("Contenu copié."))
      .catch(() => toast.error("Copie impossible."));
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-coral-300 bg-card p-4 shadow-sm">
        <TemplateEditor
          mode="edit"
          template={template}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border bg-card p-3 hover:border-coral-300/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {template.name}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {template.body}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            title="Copier le contenu"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          </Button>
        </div>
      </div>
    </li>
  );
}
