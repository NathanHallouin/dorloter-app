"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, MapPin, Palette, PawPrint, CalendarDays } from "lucide-react";
import { Button } from "@shared/ui/button";
import { respondToMatch } from "@lost-found/actions";
import { cn } from "@shared/utils";
import type { Report, ReportPhoto, ReportMatch } from "@/types";
import {
  type MatchBreakdown,
  SCORE_MAX,
  getScoreTier,
} from "../lib/match-score";

interface MatchEntry {
  match: ReportMatch;
  other: Report;
  breakdown: MatchBreakdown;
  primaryPhoto: ReportPhoto | null;
}

interface ReportMatchesProps {
  matches: MatchEntry[];
  canRespond: boolean;
}

export function ReportMatches({ matches, canRespond }: ReportMatchesProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Aucune piste à rapprocher pour l&apos;instant. On cherche dans un
        rayon de 30&nbsp;km et on vous prévient dès qu&apos;une annonce colle.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((entry) => (
        <MatchRow key={entry.match.id} entry={entry} canRespond={canRespond} />
      ))}
    </div>
  );
}

function MatchRow({
  entry,
  canRespond,
}: {
  entry: MatchEntry;
  canRespond: boolean;
}) {
  const [status, setStatus] = useState(entry.match.status);
  const [pending, setPending] = useState<"confirme" | "rejete" | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  async function respond(response: "confirme" | "rejete") {
    setPending(response);
    const result = await respondToMatch(entry.match.id, response);
    setPending(null);
    if (result.success) {
      setStatus(response);
      if (response === "confirme") {
        toast.success(
          "Belle nouvelle 💛 Les deux signalements sont marqués comme résolus."
        );
      } else {
        toast("Pas cette piste", {
          description: "On l'écarte. Les autres correspondances restent.",
        });
      }
    } else {
      toast.error(result.error ?? "Impossible d'enregistrer la réponse.");
    }
  }

  const score = Number(entry.match.score);
  const tier = getScoreTier(score);
  const distanceKm = entry.match.distanceMeters
    ? entry.match.distanceMeters / 1000
    : null;

  const tierStyle = {
    strong: {
      bg: "bg-green-50",
      text: "text-green-800",
      ring: "ring-green-200",
      label: "Forte similarité",
    },
    medium: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      ring: "ring-amber-200",
      label: "Similarité modérée",
    },
    weak: {
      bg: "bg-sable-100",
      text: "text-foreground",
      ring: "ring-sable-300",
      label: "Faible similarité",
    },
  }[tier];

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row",
        tier === "strong"
          ? "border-green-200"
          : tier === "medium"
            ? "border-amber-200"
            : "border-border"
      )}
    >
      <Link
        href={`/perdus-trouves/${entry.other.id}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-sable-100"
      >
        {entry.primaryPhoto ? (
          <Image
            src={entry.primaryPhoto.url}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            🐈
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <Link
            href={`/perdus-trouves/${entry.other.id}`}
            className="font-semibold hover:underline"
          >
            {entry.other.petName ??
              (entry.other.type === "perdu"
                ? "Animal perdu"
                : "Animal trouvé")}
          </Link>
          <span className="text-xs uppercase text-muted-foreground">
            {entry.other.type === "perdu" ? "perdu" : "trouvé"}
          </span>
        </div>

        {/* Score + tier */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
              tierStyle.bg,
              tierStyle.text,
              tierStyle.ring
            )}
          >
            <span className="tabular-nums">{score}/100</span>
            <span className="opacity-70">·</span>
            {tierStyle.label}
          </span>
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {showBreakdown ? "Masquer le détail" : "Voir le détail du score"}
          </button>
        </div>

        {/* Compact summary */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {distanceKm !== null && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m`
                : `${distanceKm.toFixed(1)} km`}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {new Date(entry.other.dateEvent).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          {entry.other.color && (
            <span className="inline-flex items-center gap-1">
              <Palette className="h-3 w-3" />
              {entry.other.color}
            </span>
          )}
          {entry.other.breed && (
            <span className="inline-flex items-center gap-1">
              <PawPrint className="h-3 w-3" />
              {entry.other.breed}
            </span>
          )}
        </div>

        {showBreakdown && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
            <BreakdownRow
              label="Distance"
              value={entry.breakdown.distance}
              max={SCORE_MAX.distance}
            />
            <BreakdownRow
              label="Couleur"
              value={entry.breakdown.color}
              max={SCORE_MAX.color}
            />
            <BreakdownRow
              label="Race"
              value={entry.breakdown.breed}
              max={SCORE_MAX.breed}
            />
            <BreakdownRow
              label="Sexe"
              value={entry.breakdown.sex}
              max={SCORE_MAX.sex}
            />
            <BreakdownRow
              label="Fenêtre temporelle"
              value={entry.breakdown.dateWindow}
              max={SCORE_MAX.dateWindow}
            />
            <p className="pt-1 text-[11px] text-muted-foreground">
              Le score est une estimation basée sur les infos déclarées. Ce
              n&apos;est pas une certitude — toujours vérifier en personne.
            </p>
          </div>
        )}

        {canRespond && status === "suggere" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => respond("confirme")}
              disabled={pending !== null}
            >
              <Check className="mr-1 h-4 w-4" />
              C&apos;est lui
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respond("rejete")}
              disabled={pending !== null}
            >
              <X className="mr-1 h-4 w-4" />
              Pas mon animal
            </Button>
          </div>
        )}

        {status === "confirme" && (
          <p
            role="status"
            aria-live="polite"
            className="pt-1 text-sm font-medium text-green-700"
          >
            ✓ Correspondance confirmée — signalements marqués comme résolus.
          </p>
        )}
        {status === "rejete" && (
          <p
            role="status"
            aria-live="polite"
            className="pt-1 text-sm text-muted-foreground"
          >
            ✗ Piste écartée.
          </p>
        )}
      </div>
    </article>
  );
}

function BreakdownRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const ratio = max === 0 ? 0 : value / max;
  return (
    <div className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-sable-200">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            ratio >= 0.75
              ? "bg-green-500"
              : ratio >= 0.4
                ? "bg-amber-500"
                : "bg-sable-400"
          )}
          style={{ width: `${ratio * 100}%` }}
          aria-hidden
        />
      </div>
      <span className="text-right font-mono tabular-nums text-foreground">
        {value}
        <span className="text-muted-foreground">/{max}</span>
      </span>
    </div>
  );
}
