"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Heart, LogIn, Users } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  applyAsVolunteer,
  cancelMySignup,
  signUpToShift,
  type ShiftWithSignups,
  type Volunteer,
} from "@shelters/public.client";

interface Props {
  shelter: { id: string; name: string };
  existing: Volunteer | null;
  openShifts: ShiftWithSignups[];
}

export function ApplyAndShifts({ shelter, existing, openShifts }: Props) {
  if (!existing) {
    return <ApplyForm shelter={shelter} />;
  }
  return (
    <div className="space-y-6">
      <StatusBlock volunteer={existing} />
      {existing.status === "active" && (
        <OpenShifts shelter={shelter} shifts={openShifts} />
      )}
    </div>
  );
}

function StatusBlock({ volunteer }: { volunteer: Volunteer }) {
  if (volunteer.status === "candidature") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <h2 className="text-base font-semibold">
          Candidature en cours d&apos;examen
        </h2>
        <p className="mt-1">
          Le refuge étudie votre candidature. Vous recevrez un email dès
          qu&apos;une décision sera prise.
        </p>
      </div>
    );
  }
  if (volunteer.status === "active") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
        <Heart className="mb-2 h-6 w-6" />
        <h2 className="text-base font-semibold">
          Vous êtes bénévole actif
        </h2>
        <p className="mt-1">
          Inscrivez-vous aux créneaux ci-dessous selon vos disponibilités.
        </p>
      </div>
    );
  }
  if (volunteer.status === "pause") {
    return (
      <div className="rounded-2xl border border-sable-200 bg-sable-50 p-6 text-sm text-foreground">
        <h2 className="text-base font-semibold">Bénévolat en pause</h2>
        <p className="mt-1">
          Votre statut bénévole est suspendu temporairement par le refuge.
          Contactez l&apos;équipe pour le réactiver.
        </p>
      </div>
    );
  }
  return null;
}

function OpenShifts({
  shelter,
  shifts,
}: {
  shelter: { id: string; name: string };
  shifts: ShiftWithSignups[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function join(id: string) {
    startTransition(async () => {
      const r = await signUpToShift(id);
      if (!r.success) {
        toast.error(r.error ?? "Inscription impossible.");
        return;
      }
      toast.success("Inscription enregistrée. À bientôt.");
      router.refresh();
    });
  }

  function leave(signupId: string) {
    if (!confirm("Annuler votre inscription à ce créneau ?")) return;
    startTransition(async () => {
      const r = await cancelMySignup(signupId);
      if (!r.success) {
        toast.error(r.error ?? "Désinscription impossible.");
        return;
      }
      toast.success("Désinscription enregistrée.");
      router.refresh();
    });
  }

  if (shifts.length === 0) {
    return (
      <div>
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-foreground">
          <Calendar className="h-5 w-5 text-coral-500" />
          Créneaux ouverts
        </h2>
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun créneau ouvert pour le moment. Revenez plus tard ou
          contactez le refuge.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-foreground">
        <Calendar className="h-5 w-5 text-coral-500" />
        Créneaux ouverts ({shifts.length})
      </h2>
      <ul className="space-y-3">
        {shifts.map((s) => {
          const remaining = s.capacity - s.signedUpCount;
          return (
            <li
              key={s.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(s.startsAt)} → {formatTime(s.endsAt)}
                  </p>
                  {s.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs">
                    <Users className="h-3 w-3" />
                    <span
                      className={
                        remaining > 0 ? "text-foreground" : "text-rose-700"
                      }
                    >
                      {s.signedUpCount}/{s.capacity}{" "}
                      {remaining > 0
                        ? `(${remaining} place${remaining > 1 ? "s" : ""} dispo)`
                        : "(complet)"}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {s.isCurrentUserSignedUp && s.currentUserSignupId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => leave(s.currentUserSignupId!)}
                      disabled={isPending}
                    >
                      Désinscrire
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => join(s.id)}
                      disabled={isPending || remaining <= 0}
                    >
                      <LogIn className="mr-1 h-3.5 w-3.5" />
                      M&apos;inscrire
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ApplyForm({ shelter }: { shelter: { id: string; name: string } }) {
  const router = useRouter();
  const [motivation, setMotivation] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await applyAsVolunteer({
        shelterId: shelter.id,
        motivation,
        skills,
        availability,
        phone,
      });
      if (!r.success) {
        toast.error(r.error ?? "Envoi impossible.");
        return;
      }
      toast.success(`Candidature envoyée à ${shelter.name}.`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-border bg-card p-6"
    >
      <div>
        <Label htmlFor="motivation">Votre motivation</Label>
        <Textarea
          id="motivation"
          rows={5}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Pourquoi voulez-vous être bénévole ? Pourquoi ce refuge ? Que pensez-vous pouvoir apporter ?"
          maxLength={2000}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {motivation.length} caractères. 50 minimum.
        </p>
      </div>

      <div>
        <Label htmlFor="availability">Disponibilités (facultatif)</Label>
        <Textarea
          id="availability"
          rows={2}
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          placeholder="Ex. samedi matin, mercredi après-midi, plutôt en soirée…"
          maxLength={1000}
        />
      </div>

      <div>
        <Label htmlFor="skills">Compétences / expérience (facultatif)</Label>
        <Textarea
          id="skills"
          rows={3}
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="Permis B + véhicule, expérience chien craintif, secourisme canin…"
          maxLength={2000}
        />
      </div>

      <div>
        <Label htmlFor="phone">Téléphone (facultatif)</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Envoi…" : "Envoyer ma candidature"}
        </Button>
      </div>
    </form>
  );
}

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
