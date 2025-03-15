"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Mail,
  Phone,
  Home,
  Baby,
  PawPrint,
  Calendar,
  CheckCircle2,
  Circle,
  CircleSlash,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import { ApplicationStatusBadge } from "./application-status";
import { updateApplicationStatus } from "@adoption/actions/applications";
import type { FollowupRow } from "@adoption/public";
import {
  TemplateSelector,
  type ResponseTemplate,
} from "@shelters/public.client";
import type { Application, Pet } from "@/types";

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Props {
  application: Application;
  pet: Pet;
  applicant: Applicant;
  catPhotoUrl: string | null;
  templates?: ResponseTemplate[];
  shelterName?: string | null;
  followups?: FollowupRow[];
}

export function ShelterApplicationRow({
  application,
  pet,
  applicant,
  catPhotoUrl,
  templates = [],
  shelterName = null,
  followups = [],
}: Props) {
  const [status, setStatus] = useState(application.status);
  const [shelterNotes, setShelterNotes] = useState(application.shelterNotes ?? "");
  const [mode, setMode] = useState<"idle" | "accept" | "refuse">("idle");
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();

  function submit(
    newStatus: "en_cours" | "acceptee" | "refusee",
    notes?: string
  ) {
    start(async () => {
      const r = await updateApplicationStatus(
        application.id,
        newStatus,
        notes ?? shelterNotes ?? undefined
      );
      if (r.success) {
        setStatus(newStatus);
        setMode("idle");
      }
    });
  }

  return (
    <article className="rounded-lg border border-border bg-card">
      <header className="flex items-start gap-4 p-4">
        <Link
          href={`/adopter/${pet.id}`}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sable-100"
        >
          {catPhotoUrl ? (
            <Image
              src={catPhotoUrl}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">
              🐈
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/adopter/${pet.id}`}
              className="font-semibold hover:underline"
            >
              {pet.name}
            </Link>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm">{applicant.name}</span>
            <ApplicationStatusBadge status={status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Reçue le{" "}
            {new Date(application.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Réduire" : "Détails"}
        </Button>
      </header>

      {expanded && (
        <div className="space-y-4 border-t border-border p-4">
          {/* Contact */}
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={`mailto:${applicant.email}`}
              className="inline-flex items-center gap-1 text-foreground hover:text-coral-500"
            >
              <Mail className="h-4 w-4" />
              {applicant.email}
            </a>
            {applicant.phone && (
              <a
                href={`tel:${applicant.phone}`}
                className="inline-flex items-center gap-1 text-foreground hover:text-coral-500"
              >
                <Phone className="h-4 w-4" />
                {applicant.phone}
              </a>
            )}
          </div>

          {/* Infos logement / foyer */}
          <div className="grid gap-3 sm:grid-cols-3">
            {application.housingType && (
              <InfoPill icon={<Home className="h-4 w-4" />} label="Logement">
                {application.housingType}
                {application.hasOutdoorAccess && " · extérieur"}
              </InfoPill>
            )}
            {application.hasChildren && (
              <InfoPill icon={<Baby className="h-4 w-4" />} label="Enfants">
                {application.childrenAges ?? "Oui"}
              </InfoPill>
            )}
            {application.hasOtherPets && (
              <InfoPill
                icon={<PawPrint className="h-4 w-4" />}
                label="Autres animaux"
              >
                {application.hasOtherPets}
              </InfoPill>
            )}
          </div>

          {application.experience && (
            <Section title="Expérience">
              <p className="whitespace-pre-wrap">{application.experience}</p>
            </Section>
          )}

          <Section title="Motivation">
            <p className="whitespace-pre-wrap">{application.motivation}</p>
          </Section>

          {application.availability && (
            <Section title="Disponibilité">
              <p className="whitespace-pre-wrap">{application.availability}</p>
            </Section>
          )}

          {/* Actions */}
          {(status === "envoyee" || status === "en_cours") && (
            <div className="flex flex-wrap gap-2 pt-2">
              {status === "envoyee" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => submit("en_cours")}
                >
                  Marquer en cours
                </Button>
              )}
              <Button
                size="sm"
                disabled={pending}
                onClick={() => setMode("accept")}
              >
                Accepter
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setMode("refuse")}
              >
                Refuser
              </Button>
            </div>
          )}

          {mode !== "idle" && (
            <div className="space-y-2 rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-sm font-medium">
                  Message à l&apos;adoptant (optionnel)
                </label>
                <TemplateSelector
                  templates={templates}
                  kind={mode === "accept" ? "acceptation" : "refus"}
                  context={{
                    applicantName: applicant.name,
                    petName: pet.name,
                    shelterName,
                  }}
                  onApply={setShelterNotes}
                />
              </div>
              <Textarea
                rows={5}
                value={shelterNotes}
                onChange={(e) => setShelterNotes(e.target.value)}
                placeholder={
                  mode === "accept"
                    ? "Félicitations ! Voici les prochaines étapes…"
                    : "Nous ne pouvons pas donner suite car…"
                }
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    submit(mode === "accept" ? "acceptee" : "refusee")
                  }
                >
                  Confirmer {mode === "accept" ? "l'acceptation" : "le refus"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMode("idle")}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {status === "acceptee" && shelterNotes && (
            <Section title="Message envoyé">
              <p className="whitespace-pre-wrap">{shelterNotes}</p>
            </Section>
          )}

          {status === "acceptee" && followups.length > 0 && (
            <Section title="Suivi post-adoption">
              <FollowupsTimeline followups={followups} />
            </Section>
          )}
        </div>
      )}
    </article>
  );
}

const STAGE_META: Record<
  "j15" | "j90" | "j365",
  { label: string; description: string }
> = {
  j15: {
    label: "J+15",
    description: "Email d'adaptation à l'adoptant",
  },
  j90: {
    label: "J+90",
    description: "Invitation à publier un témoignage public",
  },
  j365: {
    label: "J+365",
    description: "Anniversaire de l'adoption, invitation à parrainer",
  },
};

function FollowupsTimeline({ followups }: { followups: FollowupRow[] }) {
  return (
    <ol className="space-y-2">
      {followups.map((f) => {
        const meta = STAGE_META[f.stage];
        const due = new Date(f.dueAt);
        const sent = f.sentAt ? new Date(f.sentAt) : null;
        return (
          <li
            key={f.id}
            className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
          >
            <span className="mt-0.5 shrink-0">
              {f.status === "sent" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : f.status === "skipped" ? (
                <CircleSlash className="h-4 w-4 text-rose-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {meta.description}
                </span>
              </div>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {f.status === "sent" && sent
                  ? `Envoyé le ${sent.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : f.status === "skipped"
                    ? "Ignoré"
                    : `Prévu le ${due.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InfoPill({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-muted p-3 text-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="text-sm">{children}</div>
    </div>
  );
}
