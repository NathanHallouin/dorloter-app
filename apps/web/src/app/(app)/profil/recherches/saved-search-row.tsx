"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Eye,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Heart,
  Radio,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import {
  deleteSavedSearch,
  toggleSavedSearch,
  toggleSavedSearchPush,
  renameSavedSearch,
  describeParams,
  paramsToQueryString,
  type SavedSearch,
} from "@identity/public.client";

const KIND_META: Record<
  SavedSearch["kind"],
  {
    label: string;
    color: string;
    bg: string;
    listPath: string;
    icon: typeof Heart;
  }
> = {
  adoption: {
    label: "Adoption",
    color: "text-coral-700",
    bg: "bg-coral-50",
    listPath: "/adopter/liste",
    icon: Heart,
  },
  "lost-found": {
    label: "Perdus / trouvés",
    color: "text-lavande-700",
    bg: "bg-lavande-50",
    listPath: "/perdus-trouves",
    icon: Radio,
  },
};

export function SavedSearchRow({ search }: { search: SavedSearch }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(search.name);

  const meta = KIND_META[search.kind];
  const Icon = meta.icon;
  const labels = describeParams(search.params);
  const query = paramsToQueryString(search.params);
  const replayHref = query ? `${meta.listPath}?${query}` : meta.listPath;

  function handleToggle(next: boolean) {
    startTransition(async () => {
      const result = await toggleSavedSearch(search.id, next);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success(
        next
          ? "Alertes réactivées."
          : "Alertes mises en pause."
      );
      router.refresh();
    });
  }

  function handleTogglePush(next: boolean) {
    startTransition(async () => {
      const result = await toggleSavedSearchPush(search.id, next);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success(
        next
          ? "Mode guetteur activé : push instantané sur match."
          : "Mode guetteur désactivé."
      );
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Supprimer la recherche « ${search.name} » ? Cette action est définitive.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteSavedSearch(search.id);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Recherche supprimée.");
      router.refresh();
    });
  }

  function handleRename() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2 || trimmed === search.name) {
      setEditing(false);
      setNameDraft(search.name);
      return;
    }
    startTransition(async () => {
      const result = await renameSavedSearch(search.id, trimmed);
      if (!result.success) {
        toast.error(result.error ?? "Renommage impossible.");
        return;
      }
      setEditing(false);
      toast.success("Recherche renommée.");
      router.refresh();
    });
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 inline-flex items-center gap-1.5">
            <span
              className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            {!search.isActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <BellOff className="h-3 w-3" />
                en pause
              </span>
            )}
            {search.pushEnabled && search.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral-800">
                <Eye className="h-3 w-3" />
                Guetteur
              </span>
            )}
          </div>

          {editing ? (
            <div className="flex gap-2">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={120}
                autoFocus
                className="max-w-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleRename}
                disabled={isPending}
              >
                OK
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setNameDraft(search.name);
                }}
              >
                Annuler
              </Button>
            </div>
          ) : (
            <h3 className="text-base font-semibold text-foreground">
              {search.name}
            </h3>
          )}

          {labels.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {labels.map((label, i) => (
                <li
                  key={i}
                  className="inline-flex items-center rounded-md border border-border bg-sable-50 px-2 py-0.5 text-[11px] text-foreground"
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Pas de filtre actif : tout le catalogue.
            </p>
          )}

          {search.lastNotifiedAt && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-coral-500" />
              Dernière notification :{" "}
              {new Date(search.lastNotifiedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={replayHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium hover:border-coral-300"
            title="Re-lancer cette recherche"
          >
            <Search className="h-3.5 w-3.5" />
            Lancer
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleToggle(!search.isActive)}
            disabled={isPending}
            title={search.isActive ? "Mettre en pause" : "Réactiver"}
          >
            {search.isActive ? (
              <Bell className="h-3.5 w-3.5 text-coral-600" />
            ) : (
              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          {search.kind === "lost-found" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleTogglePush(!search.pushEnabled)}
              disabled={isPending}
              title={
                search.pushEnabled
                  ? "Mode guetteur actif (push instantané), cliquer pour désactiver"
                  : "Activer le mode guetteur (push instantané)"
              }
            >
              <Eye
                className={`h-3.5 w-3.5 ${
                  search.pushEnabled
                    ? "text-coral-600"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            disabled={isPending || editing}
            title="Renommer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isPending}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          </Button>
        </div>
      </div>
    </li>
  );
}
