"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BellPlus, Check } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { createSavedSearch } from "../actions/saved-searches";

interface SaveSearchButtonProps {
  kind: "adoption" | "lost-found";
  /** Liste des query params autorisés à être persistés (filtre la pagination). */
  whitelist: readonly string[];
  isSignedIn: boolean;
  /** Suggestion de nom par défaut (ex. "Chats noirs Paris"). */
  defaultName?: string;
  label?: string;
}

export function SaveSearchButton({
  kind,
  whitelist,
  isSignedIn,
  defaultName = "Ma recherche",
  label = "Enregistrer cette recherche",
}: SaveSearchButtonProps) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isSignedIn) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(
          typeof window === "undefined" ? "/" : window.location.pathname + window.location.search
        )}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground hover:border-coral-300 hover:text-foreground"
      >
        <BellPlus className="h-3.5 w-3.5" />
        {label}
      </Link>
    );
  }

  const params: Record<string, string> = {};
  for (const key of whitelist) {
    const v = searchParams.get(key);
    if (v) params[key] = v;
  }

  const paramCount = Object.keys(params).length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Donnez un nom à votre recherche (2 caractères min).");
      return;
    }

    // Conversions de types attendues par les schémas Zod : pour
    // lost-found on a chipped:boolean, radius:int, lat/lng:float. Pour
    // adoption tout est string.
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k === "chipped") normalized[k] = v === "1" || v === "true";
      else if (k === "radius" || k === "radiusKm")
        normalized[k] = Number(v);
      else if (k === "lat" || k === "lng" || k === "centerLat" || k === "centerLng")
        normalized[k] = Number(v);
      else normalized[k] = v;
    }

    startTransition(async () => {
      const result = await createSavedSearch({
        kind,
        name: trimmed,
        params: normalized,
      });
      if (!result.success) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success("Recherche enregistrée. Vous recevrez un email dès qu'un nouvel animal correspond.");
      setSaved(true);
      setOpen(false);
    });
  }

  if (saved) {
    return (
      <div className="inline-flex h-9 items-center gap-1.5 rounded-md border border-coral-300 bg-coral-50 px-3 text-sm font-medium text-coral-700">
        <Check className="h-3.5 w-3.5" />
        Enregistrée
        <Link
          href="/profil/recherches"
          className="ml-1 underline-offset-2 hover:underline"
        >
          Gérer
        </Link>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <BellPlus className="h-3.5 w-3.5 text-coral-500" />
        {label}
        {paramCount > 0 && (
          <span className="ml-1 rounded-full bg-coral-100 px-1.5 py-0.5 text-[10px] font-bold text-coral-700">
            {paramCount} filtre{paramCount > 1 ? "s" : ""}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-border bg-card p-3 shadow-lg"
          >
            <div>
              <label
                htmlFor="saved-search-name"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Nom de la recherche
              </label>
              <Input
                id="saved-search-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Chats noirs adultes Paris"
                maxLength={120}
                autoFocus
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Un email quotidien quand un nouvel animal matche vos
                {" "}{paramCount}{" "}filtre{paramCount > 1 ? "s" : ""}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
