"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Cat,
  ChevronDown,
  Dog,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@shared/ui/input";
import { cn } from "@shared/utils";

const SERVICES: { key: string; label: string }[] = [
  { key: "medication", label: "Médicaments" },
  { key: "grooming", label: "Toilettage" },
  { key: "outdoorAccess", label: "Accès extérieur" },
  { key: "nightStaff", label: "Personnel de nuit" },
  { key: "transport", label: "Transport" },
  { key: "senior", label: "Senior friendly" },
];

const PRICE_PRESETS = [15, 20, 25, 30, 40];

/**
 * Bar de filtres sticky pour l'annuaire pensions. Ordre :
 *   1. Recherche texte
 *   2. Espèce (chats/chiens)
 *   3. Prix max (par espèce sélectionnée)
 *   4. Services (toggle group)
 *
 * Les changements sont persistés dans l'URL — l'état est entièrement
 * dérivé des searchParams pour permettre le partage de filtres.
 */
export function PensionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cats = searchParams.get("cats") === "1";
  const dogs = searchParams.get("dogs") === "1";
  const maxPriceCat = searchParams.get("maxPriceCat");
  const maxPriceDog = searchParams.get("maxPriceDog");
  const search = searchParams.get("q") ?? "";
  const activeServices = (searchParams.get("services") ?? "")
    .split(",")
    .filter(Boolean);

  const [showMore, setShowMore] = useState(activeServices.length > 0);
  const [searchDraft, setSearchDraft] = useState(search);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      router.push(`/pensions?${params.toString()}`);
    },
    [router, searchParams]
  );

  function toggleService(key: string) {
    const next = activeServices.includes(key)
      ? activeServices.filter((s) => s !== key)
      : [...activeServices, key];
    update({ services: next.length > 0 ? next.join(",") : null });
  }

  function reset() {
    router.push("/pensions");
    setSearchDraft("");
  }

  const activeCount =
    (cats ? 1 : 0) +
    (dogs ? 1 : 0) +
    (maxPriceCat ? 1 : 0) +
    (maxPriceDog ? 1 : 0) +
    (search ? 1 : 0) +
    activeServices.length;

  return (
    <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/75 sm:mx-0 sm:rounded-2xl sm:border sm:bg-card sm:px-4 sm:py-4 sm:shadow-sm sm:backdrop-blur-none">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher une pension"
            placeholder="Nom ou ville…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                update({ q: searchDraft.trim() || null });
              }
            }}
            onBlur={() => {
              if (searchDraft !== search) {
                update({ q: searchDraft.trim() || null });
              }
            }}
            className="h-9 pl-8"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Plus de filtres
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition",
              showMore && "rotate-180"
            )}
          />
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-3 py-1.5 text-sm font-medium text-coral-700 hover:bg-coral-100"
          >
            <X className="h-3 w-3" />
            Effacer ({activeCount})
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <FilterChip
          icon={<Cat className="h-3.5 w-3.5" />}
          active={cats}
          onClick={() => update({ cats: cats ? null : "1" })}
          label="Chats"
        />
        <FilterChip
          icon={<Dog className="h-3.5 w-3.5" />}
          active={dogs}
          onClick={() => update({ dogs: dogs ? null : "1" })}
          label="Chiens"
        />
      </div>

      {showMore && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {cats && (
            <PricePresetRow
              label="Prix max chat / jour"
              currentValue={maxPriceCat}
              presets={PRICE_PRESETS}
              onChange={(v) => update({ maxPriceCat: v })}
            />
          )}
          {dogs && (
            <PricePresetRow
              label="Prix max chien / jour"
              currentValue={maxPriceDog}
              presets={PRICE_PRESETS}
              onChange={(v) => update({ maxPriceDog: v })}
            />
          )}
          {!cats && !dogs && (
            <p className="text-xs text-muted-foreground">
              Sélectionnez une espèce pour filtrer par prix.
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Services proposés
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SERVICES.map((s) => (
                <FilterChip
                  key={s.key}
                  active={activeServices.includes(s.key)}
                  onClick={() => toggleService(s.key)}
                  label={s.label}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  icon,
  active,
  onClick,
  label,
  size = "default",
}: {
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
  size?: "default" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition",
        size === "sm"
          ? "px-2.5 py-1 text-xs"
          : "px-3.5 py-1.5 text-sm",
        active
          ? "border-coral-300 bg-coral-50 text-coral-700"
          : "border-sable-300 bg-white text-foreground hover:border-coral-300 dark:bg-card"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PricePresetRow({
  label,
  currentValue,
  presets,
  onChange,
}: {
  label: string;
  currentValue: string | null;
  presets: number[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          active={!currentValue}
          onClick={() => onChange(null)}
          label="Sans limite"
          size="sm"
        />
        {presets.map((p) => (
          <FilterChip
            key={p}
            active={currentValue === String(p)}
            onClick={() => onChange(String(p))}
            label={`≤ ${p} €`}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
