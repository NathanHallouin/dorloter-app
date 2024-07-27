"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@shared/ui/button";
import {
  ReportStatusBadge,
  ReportTypeBadge,
} from "./report-status-badge";
import { updateReportStatus, deleteReport } from "@lost-found/actions";
import type { Report, ReportPhoto } from "@/types";

interface Props {
  report: Report;
  primaryPhoto: ReportPhoto | null;
}

export function MyReportRow({ report, primaryPhoto }: Props) {
  const [status, setStatus] = useState(report.status);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
      <Link
        href={`/perdus-trouves/${report.id}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sable-100"
      >
        {primaryPhoto ? (
          <Image
            src={primaryPhoto.url}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">
            🐈
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/perdus-trouves/${report.id}`}
            className="font-semibold hover:underline"
          >
            {report.petName ??
              (report.type === "perdu" ? "Animal perdu" : "Animal trouvé")}
          </Link>
          <ReportTypeBadge type={report.type} />
          <ReportStatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date(report.dateEvent).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {report.address && ` · ${report.address}`}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {status === "actif" && (
            <>
              <Link
                href={`/mes-signalements/${report.id}/edit`}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
              >
                Compléter
              </Link>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await updateReportStatus(report.id, "resolu");
                    if (r.success) setStatus("resolu");
                  })
                }
              >
                Marquer résolu
              </Button>
            </>
          )}
          {status === "resolu" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await updateReportStatus(report.id, "actif");
                  if (r.success) setStatus("actif");
                })
              }
            >
              Réactiver
            </Button>
          )}
          {!confirmDelete ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await deleteReport(report.id);
                  })
                }
              >
                Confirmer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
