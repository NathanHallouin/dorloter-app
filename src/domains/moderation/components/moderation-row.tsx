"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, EyeOff, Check } from "lucide-react";
import { Button } from "@shared/ui/button";
import {
  resolveContentReport,
  getContentReportsDetails,
} from "@moderation/actions";

interface ModerationRowProps {
  contentType: "pet" | "report" | "shelter" | "user";
  contentId: string;
  label: string;
  contentTypeLabel: string;
  contentPath: string;
  count: number;
  distinctReporters: number;
  latestAt: Date;
}

export function ModerationRow({
  contentType,
  contentId,
  label,
  contentTypeLabel,
  contentPath,
  count,
  distinctReporters,
  latestAt,
}: ModerationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<
    Awaited<ReturnType<typeof getContentReportsDetails>> | null
  >(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [pending, start] = useTransition();
  const [hidden, setHidden] = useState(false);

  async function toggleExpand() {
    if (!expanded && !details) {
      setLoadingDetails(true);
      const r = await getContentReportsDetails(contentType, contentId);
      setDetails(r);
      setLoadingDetails(false);
    }
    setExpanded((v) => !v);
  }

  async function resolve(action: "masque" | "rejete") {
    const ids = (details ?? []).map((d) => d.report.id);
    if (ids.length === 0) {
      const r = await getContentReportsDetails(contentType, contentId);
      ids.push(...r.map((d) => d.report.id));
    }
    start(async () => {
      const res = await resolveContentReport(ids, action);
      if (!res.success) {
        toast.error(res.error ?? "Échec.");
        return;
      }
      toast.success(
        action === "masque"
          ? "Contenu masqué."
          : "Signalements rejetés."
      );
      setHidden(true);
    });
  }

  if (hidden) return null;

  return (
    <article className="rounded-lg border border-border bg-card">
      <header className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-sable-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
              {contentTypeLabel}
            </span>
            <h3 className="truncate font-semibold">{label}</h3>
            {contentPath !== "#" && (
              <Link
                href={`${contentPath}${contentId}`}
                target="_blank"
                className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-coral-600"
              >
                voir la fiche
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <strong className="text-destructive">{distinctReporters}</strong>{" "}
            signalement{distinctReporters > 1 ? "s" : ""} distinct
            {distinctReporters > 1 ? "s" : ""} ({count} au total) · dernier{" "}
            {new Date(latestAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={toggleExpand}>
          {expanded ? "Réduire" : "Détails"}
        </Button>
      </header>

      {expanded && (
        <div className="space-y-3 border-t border-border p-4">
          {loadingDetails ? (
            <p className="text-sm text-muted-foreground">On rassemble les détails…</p>
          ) : details && details.length > 0 ? (
            <ul className="space-y-2">
              {details.map(({ report, reporter }) => (
                <li
                  key={report.id}
                  className="rounded-md bg-sable-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">
                      {reporter?.name ?? "Anonyme"}
                    </span>
                    {reporter?.email && (
                      <span className="text-xs text-muted-foreground">
                        {reporter.email}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-coral-700">
                    {report.reason.replace(/_/g, " ")}
                  </p>
                  {report.comment && (
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {report.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => resolve("masque")}
            >
              <EyeOff className="mr-1.5 h-4 w-4" />
              Masquer le contenu
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => resolve("rejete")}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Rejeter les signalements
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
