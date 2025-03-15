"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  createTemplate,
  updateTemplate,
  TEMPLATE_VARIABLES,
} from "@shelters/public.client";
import type { ResponseTemplate, ResponseTemplateKind } from "@shelters/public";

interface TemplateEditorProps {
  mode: "create" | "edit";
  template?: ResponseTemplate;
  onSaved?: () => void;
  onCancel?: () => void;
}

const KIND_OPTIONS: Array<{ value: ResponseTemplateKind; label: string }> = [
  { value: "acceptation", label: "Acceptation" },
  { value: "refus", label: "Refus" },
  { value: "demande_infos", label: "Demande d'infos" },
  { value: "rdv", label: "Rendez-vous" },
  { value: "generique", label: "Générique" },
];

export function TemplateEditor({
  mode,
  template,
  onSaved,
  onCancel,
}: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState(template?.body ?? "");
  const [name, setName] = useState(template?.name ?? "");
  const [kind, setKind] = useState<ResponseTemplateKind>(
    template?.kind ?? "generique"
  );

  function insertVariable(key: string) {
    setBody((prev) => `${prev}{{${key}}}`);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (template) formData.set("id", template.id);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTemplate(formData)
          : await updateTemplate(formData);
      if (!result.success) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success(
        mode === "create" ? "Template créé." : "Template mis à jour."
      );
      if (mode === "create") {
        setName("");
        setBody("");
        setKind("generique");
      }
      onSaved?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="space-y-1.5">
          <Label htmlFor={`template-name-${mode}`}>Nom interne *</Label>
          <Input
            id={`template-name-${mode}`}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Refus profil non adapté"
            required
            maxLength={255}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`template-kind-${mode}`}>Catégorie *</Label>
          <select
            id={`template-kind-${mode}`}
            name="kind"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as ResponseTemplateKind)
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-coral-500 focus-visible:ring-2 focus-visible:ring-coral-500/30"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`template-body-${mode}`}>Contenu *</Label>
          <div className="flex flex-wrap gap-1">
            {Object.keys(TEMPLATE_VARIABLES).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => insertVariable(key)}
                className="rounded-md border border-coral-200 bg-coral-50 px-2 py-0.5 text-[11px] font-semibold text-coral-700 hover:bg-coral-100"
                title={`Insérer {{${key}}}`}
              >
                + {key}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          id={`template-body-${mode}`}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          required
          minLength={10}
          maxLength={5000}
          placeholder={
            "Bonjour {{prenomCandidat}},\n\nMerci de l'intérêt que vous portez à {{nomAnimal}}…"
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {body.length} / 5000 caractères
        </p>
      </div>

      <input
        type="hidden"
        name="position"
        value={template?.position ?? 0}
      />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer le template"
              : "Enregistrer"}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            Annuler
          </Button>
        ) : null}
      </div>
    </form>
  );
}
