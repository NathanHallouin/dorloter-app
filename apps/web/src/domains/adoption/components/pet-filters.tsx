"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import Link from "next/link";
import { X, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { Input } from "@shared/ui/input";

const FILTER_KEYS = [
  "search",
  "species",
  "sex",
  "ageCategory",
  "okWithCats",
  "okWithDogs",
  "okWithChildren",
] as const;

export function PetFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/adopter/liste?${params.toString()}`);
    },
    [router, searchParams]
  );

  const activeCount = useMemo(
    () => FILTER_KEYS.reduce((n, k) => (searchParams.get(k) ? n + 1 : n), 0),
    [searchParams]
  );

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/75 md:static md:mx-0 md:border-none md:bg-transparent md:p-0 md:backdrop-blur-none">
      <div className="mb-2 flex items-center gap-2 md:mb-3">
        <SlidersHorizontal
          className="hidden h-4 w-4 text-muted-foreground md:block"
          aria-hidden
        />
        <Input
          aria-label="Rechercher un nom"
          placeholder="Rechercher un nom..."
          defaultValue={searchParams.get("search") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("search", e.currentTarget.value);
            }
          }}
          className="h-9 w-full md:max-w-xs"
        />
        {activeCount > 0 && (
          <Link
            href="/adopter/liste"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-coral-50 px-2.5 py-1 text-xs font-medium text-coral-700 hover:bg-coral-100"
            aria-label={`Réinitialiser les ${activeCount} filtre${activeCount > 1 ? "s" : ""}`}
          >
            <X className="h-3 w-3" />
            Effacer
            <span className="sr-only">{activeCount} actifs</span>
          </Link>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        <Select
          defaultValue={searchParams.get("species") ?? "all"}
          onValueChange={(v) => updateFilter("species", v ?? "all")}
        >
          <SelectTrigger className="shrink-0">
            <SelectValue placeholder="Espèce" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Chats et chiens</SelectItem>
            <SelectItem value="chat">Chats</SelectItem>
            <SelectItem value="chien">Chiens</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("sex") ?? "all"}
          onValueChange={(v) => updateFilter("sex", v ?? "all")}
        >
          <SelectTrigger className="shrink-0">
            <SelectValue placeholder="Sexe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sexes</SelectItem>
            <SelectItem value="male">Mâle</SelectItem>
            <SelectItem value="femelle">Femelle</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("ageCategory") ?? "all"}
          onValueChange={(v) => updateFilter("ageCategory", v ?? "all")}
        >
          <SelectTrigger className="shrink-0">
            <SelectValue placeholder="Âge" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les âges</SelectItem>
            <SelectItem value="chaton">Chaton</SelectItem>
            <SelectItem value="jeune">Jeune</SelectItem>
            <SelectItem value="adulte">Adulte</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("okWithCats") ?? "all"}
          onValueChange={(v) => updateFilter("okWithCats", v ?? "all")}
        >
          <SelectTrigger className="shrink-0">
            <SelectValue placeholder="OK chats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Compatibilité chats</SelectItem>
            <SelectItem value="oui">OK avec chats</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("okWithDogs") ?? "all"}
          onValueChange={(v) => updateFilter("okWithDogs", v ?? "all")}
        >
          <SelectTrigger className="shrink-0">
            <SelectValue placeholder="OK chiens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Compatibilité chiens</SelectItem>
            <SelectItem value="oui">OK avec chiens</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("okWithChildren") ?? "all"}
          onValueChange={(v) => updateFilter("okWithChildren", v ?? "all")}
        >
          <SelectTrigger className="shrink-0">
            <SelectValue placeholder="OK enfants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Compatibilité enfants</SelectItem>
            <SelectItem value="oui">OK avec enfants</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
