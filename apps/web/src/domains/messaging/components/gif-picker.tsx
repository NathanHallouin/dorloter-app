"use client";

/**
 * Picker GIF web — dialog avec recherche debouncée + grille de résultats.
 *
 * Consomme `/api/v1/gifs/search` (proxy Tenor, clé serveur). Au tap d'un
 * GIF, on remonte au parent qui l'envoie comme attachment de message.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/ui/dialog";
import { Input } from "@shared/ui/input";
import { Button } from "@shared/ui/button";

export interface SelectedGif {
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  externalId: string;
}

interface GifResultDto {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string | null;
}

export function GifPickerTrigger({
  onSelect,
  children,
}: {
  onSelect: (gif: SelectedGif) => void;
  /** Élément cliquable utilisé comme déclencheur (ex. `<Button>...`). */
  children: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);

  function handlePick(gif: SelectedGif) {
    setOpen(false);
    onSelect(gif);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choisir un GIF</DialogTitle>
        </DialogHeader>
        <GifPickerBody onPick={handlePick} active={open} />
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Powered by Tenor
        </p>
      </DialogContent>
    </Dialog>
  );
}

function GifPickerBody({
  onPick,
  active,
}: {
  onPick: (gif: SelectedGif) => void;
  active: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<GifResultDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "24" });
        if (debounced) params.set("q", debounced);
        const res = await fetch(`/api/v1/gifs/search?${params.toString()}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(
            body?.error?.message ?? `Recherche GIF échouée (${res.status})`
          );
        }
        const json = (await res.json()) as {
          data: { results: GifResultDto[] };
        };
        if (!cancelled) setItems(json.data.results);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [debounced, active]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (chien, chat, joie…)"
          className="pl-9"
        />
        {search ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            onClick={() => setSearch("")}
            aria-label="Effacer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : error ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun GIF trouvé.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((g) => (
              <button
                key={g.id}
                type="button"
                className="overflow-hidden rounded-lg border border-border bg-muted/40 transition-transform hover:scale-[0.98]"
                onClick={() =>
                  onPick({
                    url: g.url,
                    previewUrl: g.previewUrl,
                    width: g.width,
                    height: g.height,
                    externalId: g.id,
                  })
                }
              >
                <Image
                  src={g.previewUrl}
                  alt={g.title ?? ""}
                  width={200}
                  height={Math.round(200 * (g.height / g.width || 1))}
                  unoptimized
                  className="h-auto w-full"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
