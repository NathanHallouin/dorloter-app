"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { ApplicationStatusBadge } from "./application-status";
import { cancelApplication } from "@adoption/actions/applications";
import type { Application, Pet } from "@/types";

interface Props {
  application: Application;
  pet: Pet;
  catPhotoUrl: string | null;
}

export function MyApplicationRow({ application, pet, catPhotoUrl }: Props) {
  const [status, setStatus] = useState(application.status);
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canCancel = status === "envoyee" || status === "en_cours";

  return (
    <article className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
      <Link
        href={`/adopter/${pet.id}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sable-100"
      >
        {catPhotoUrl ? (
          <Image
            src={catPhotoUrl}
            alt={pet.name}
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
            href={`/adopter/${pet.id}`}
            className="font-semibold hover:underline"
          >
            {pet.name}
          </Link>
          <ApplicationStatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Candidature envoyée le{" "}
          {new Date(application.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {application.shelterNotes && status !== "envoyee" && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Message du refuge
            </p>
            <p className="whitespace-pre-wrap">{application.shelterNotes}</p>
          </div>
        )}

        {canCancel && (
          <div className="pt-1">
            {!confirmCancel ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setConfirmCancel(true)}
              >
                Annuler ma candidature
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await cancelApplication(application.id);
                      setConfirmCancel(false);
                      if (r.success) {
                        setStatus("annulee");
                        toast("Candidature annulée.");
                      } else {
                        toast.error(r.error ?? "Impossible d'annuler.");
                      }
                    })
                  }
                >
                  Confirmer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmCancel(false)}
                >
                  Non
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
