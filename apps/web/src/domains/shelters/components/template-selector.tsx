"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@shared/ui/button";
import {
  renderTemplate,
  buildTemplateContext,
} from "../lib/template-variables";
import type {
  ResponseTemplate,
  ResponseTemplateKind,
} from "../lib/template-types";

interface TemplateSelectorProps {
  templates: ResponseTemplate[];
  /** Filtre les templates par catégorie. `null` = pas de filtre. */
  kind?: ResponseTemplateKind | null;
  /** Contexte pour le remplacement des variables. */
  context: {
    applicantName?: string | null;
    petName?: string | null;
    shelterName?: string | null;
  };
  /** Appelé quand l'utilisateur applique un template au champ texte. */
  onApply: (renderedBody: string) => void;
}

export function TemplateSelector({
  templates,
  kind,
  context,
  onApply,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!kind) return templates;
    return templates.filter((t) => t.kind === kind);
  }, [templates, kind]);

  if (filtered.length === 0) {
    return null;
  }

  function apply(tpl: ResponseTemplate) {
    const ctx = buildTemplateContext({
      applicantName: context.applicantName ?? null,
      petName: context.petName ?? null,
      shelterName: context.shelterName ?? null,
    });
    onApply(renderTemplate(tpl.body, ctx));
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5 text-coral-500" />
        Utiliser un template
        <span className="rounded-full bg-sable-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-sable-800">
          {filtered.length}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-1.5 shadow-lg">
            <ul className="max-h-72 space-y-0.5 overflow-y-auto">
              {filtered.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    type="button"
                    onClick={() => apply(tpl)}
                    className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-coral-50"
                  >
                    <p className="font-semibold text-foreground">{tpl.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {tpl.body}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
