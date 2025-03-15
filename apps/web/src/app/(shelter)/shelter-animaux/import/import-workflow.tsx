"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Trash2, Upload } from "lucide-react";
import { Button } from "@shared/ui/button";
import {
  importPetsFromCsv,
  parseCSV,
  suggestMapping,
  normalizeValue,
  PET_FIELDS,
  PET_FIELD_LABELS,
  type PetField,
} from "@adoption/public.client";

type CellMap = Map<number, PetField>;

interface PreviewRow {
  index: number;
  data: Record<string, unknown>;
  errors: string[];
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function ImportWorkflow() {
  const router = useRouter();
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CellMap>(new Map());
  const [imported, setImported] = useState<{
    created: number;
    errors: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(file: File) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Fichier trop volumineux (2 MB max).");
      return;
    }
    file
      .text()
      .then((text) => {
        const rows = parseCSV(text);
        if (rows.length < 2) {
          toast.error(
            "Fichier vide ou sans en-tête détecté. Vérifiez le format."
          );
          return;
        }
        const headers = rows[0]!;
        const dataRows = rows.slice(1);
        const suggested = suggestMapping(headers);
        setRawHeaders(headers);
        setRawRows(dataRows);
        setMapping(suggested);
        setImported(null);
        toast.success(
          `${dataRows.length} ligne${dataRows.length > 1 ? "s" : ""} détectée${dataRows.length > 1 ? "s" : ""}, ${suggested.size} colonne${suggested.size > 1 ? "s" : ""} auto-mappée${suggested.size > 1 ? "s" : ""}.`
        );
      })
      .catch((err) => {
        console.error(err);
        toast.error("Lecture du fichier impossible.");
      });
  }

  function reset() {
    setRawHeaders([]);
    setRawRows([]);
    setMapping(new Map());
    setImported(null);
  }

  function updateMapping(columnIndex: number, field: PetField | "") {
    setMapping((prev) => {
      const next = new Map(prev);
      // Une cible ne peut être assignée qu'à une colonne — on retire les autres
      if (field) {
        for (const [k, v] of next) if (v === field) next.delete(k);
        next.set(columnIndex, field);
      } else {
        next.delete(columnIndex);
      }
      return next;
    });
  }

  const preview = useMemo<PreviewRow[]>(() => {
    if (rawRows.length === 0) return [];
    const out: PreviewRow[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]!;
      const obj: Record<string, unknown> = {};
      const errors: string[] = [];
      for (const [col, field] of mapping) {
        const raw = row[col] ?? "";
        const normalized = normalizeValue(field, raw);
        if (normalized !== null) obj[field] = normalized;
      }
      if (
        typeof obj.name !== "string" ||
        (obj.name as string).trim().length === 0
      ) {
        errors.push("Nom manquant ou vide");
      }
      if (obj.species !== "chat" && obj.species !== "chien") {
        errors.push("Espèce non reconnue (chat ou chien attendu)");
      }
      out.push({ index: i, data: obj, errors });
    }
    return out;
  }, [rawRows, mapping]);

  const validCount = preview.filter((r) => r.errors.length === 0).length;
  const invalidCount = preview.length - validCount;
  const nameMapped = Array.from(mapping.values()).includes("name");
  const speciesMapped = Array.from(mapping.values()).includes("species");

  function commit() {
    if (!nameMapped) {
      toast.error("Mappez d'abord la colonne « Nom ».");
      return;
    }
    if (!speciesMapped) {
      toast.error("Mappez d'abord la colonne « Espèce ».");
      return;
    }
    const validRows = preview
      .filter((r) => r.errors.length === 0)
      .map((r) => r.data);
    if (validRows.length === 0) {
      toast.error("Aucune ligne valide à importer.");
      return;
    }
    startTransition(async () => {
      const result = await importPetsFromCsv(validRows);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Import impossible.");
        return;
      }
      toast.success(
        `${result.data.created} animal${result.data.created > 1 ? "ux" : ""} créé${result.data.created > 1 ? "s" : ""}.`
      );
      setImported({
        created: result.data.created,
        errors: result.data.errors.length,
      });
    });
  }

  if (imported) {
    return (
      <div className="rounded-2xl border border-green-300 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-700" />
        <p className="text-lg font-bold text-foreground">
          {imported.created} animal{imported.created > 1 ? "ux" : ""} importé
          {imported.created > 1 ? "s" : ""}
        </p>
        {imported.errors > 0 && (
          <p className="mt-1 text-sm text-foreground">
            {imported.errors} ligne{imported.errors > 1 ? "s" : ""} rejetée
            {imported.errors > 1 ? "s" : ""} par le serveur.
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            onClick={() => router.push("/shelter-animaux")}
          >
            Voir mes animaux
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              router.refresh();
            }}
          >
            Importer un autre fichier
          </Button>
        </div>
      </div>
    );
  }

  if (rawHeaders.length === 0) {
    return (
      <div className="space-y-4">
        <label
          htmlFor="csv-upload"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center transition hover:border-coral-300 hover:bg-coral-50/30"
        >
          <Upload className="h-8 w-8 text-coral-500" />
          <div>
            <p className="font-semibold text-foreground">
              Cliquez pour sélectionner un fichier CSV
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Séparateur auto-détecté (virgule, point-virgule, tabulation). 2
              MB max, 500 lignes max.
            </p>
          </div>
          <input
            id="csv-upload"
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
            }}
          />
        </label>
        <section className="rounded-xl border border-sable-200 bg-sable-50/40 p-4 text-xs">
          <p className="mb-1.5 font-semibold text-foreground">
            Colonnes reconnues automatiquement (en-tête en français ou
            anglais)
          </p>
          <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {PET_FIELDS.map((f) => (
              <li key={f} className="text-muted-foreground">
                <strong className="text-foreground">{PET_FIELD_LABELS[f]}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Étape mapping */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">
            1. Mapping des colonnes
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Reprendre depuis zéro
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Vérifiez l&apos;association entre vos colonnes (à gauche) et les
          champs Dorloter (à droite). « — Ignorer — » exclut la colonne.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {rawHeaders.map((h, i) => {
            const current = mapping.get(i) ?? "";
            return (
              <li
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-mono text-muted-foreground">
                  {h || `Colonne ${i + 1}`}
                </span>
                <select
                  value={current}
                  onChange={(e) =>
                    updateMapping(i, e.target.value as PetField | "")
                  }
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                >
                  <option value="">· Ignorer ·</option>
                  {PET_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {PET_FIELD_LABELS[f]}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Preview */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">2. Aperçu</h2>
          <p className="text-xs">
            <strong className="text-green-700">{validCount}</strong> valide
            {validCount > 1 ? "s" : ""}
            {invalidCount > 0 && (
              <>
                {" · "}
                <strong className="text-rose-600">{invalidCount}</strong>{" "}
                à corriger
              </>
            )}
          </p>
        </div>

        {(!nameMapped || !speciesMapped) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Mappez les colonnes <strong>Nom</strong> et{" "}
              <strong>Espèce</strong> avant de valider l&apos;import.
            </span>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-sable-50">
              <tr className="text-left">
                <th className="w-10 px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Nom</th>
                <th className="px-2 py-1.5">Espèce</th>
                <th className="px-2 py-1.5">Race</th>
                <th className="px-2 py-1.5">Sexe</th>
                <th className="px-2 py-1.5">Erreurs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.slice(0, 50).map((row) => (
                <tr
                  key={row.index}
                  className={
                    row.errors.length > 0 ? "bg-rose-50/40" : "hover:bg-sable-50/30"
                  }
                >
                  <td className="px-2 py-1 tabular-nums text-muted-foreground">
                    {row.index + 1}
                  </td>
                  <td className="px-2 py-1 font-medium">
                    {(row.data.name as string) ?? ""}
                  </td>
                  <td className="px-2 py-1">{(row.data.species as string) ?? ""}</td>
                  <td className="px-2 py-1">{(row.data.breed as string) ?? ""}</td>
                  <td className="px-2 py-1">{(row.data.sex as string) ?? ""}</td>
                  <td className="px-2 py-1 text-rose-700">
                    {row.errors.join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 50 && (
            <p className="border-t border-border bg-sable-50/50 px-2 py-1.5 text-center text-[10px] text-muted-foreground">
              50 premières lignes affichées sur {preview.length}. Toutes
              seront traitées à la validation.
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Les animaux importés seront publiés en « Disponible » par défaut.
          Vous pourrez les passer en observation après import si besoin.
        </p>
        <Button
          type="button"
          onClick={commit}
          disabled={
            isPending ||
            validCount === 0 ||
            !nameMapped ||
            !speciesMapped
          }
        >
          {isPending
            ? "Import en cours…"
            : `Importer ${validCount} animal${validCount > 1 ? "ux" : ""}`}
        </Button>
      </div>
    </div>
  );
}
