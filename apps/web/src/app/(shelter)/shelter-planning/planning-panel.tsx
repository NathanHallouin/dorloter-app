"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  Calendar,
  Check,
  Clock,
  LogIn,
  LogOut,
  Mail,
  Pause,
  Phone,
  Play,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  cancelShift,
  checkInSignup,
  checkOutSignup,
  deleteShift,
  markSignupAbsent,
  rejectVolunteer,
  setVolunteerStatus,
  signupHours,
  upsertShift,
  validateVolunteer,
  SHIFT_STATUS_CLASSES,
  SHIFT_STATUS_LABELS,
  SHIFT_SIGNUP_STATUS_LABELS,
  VOLUNTEER_STATUS_CLASSES,
  VOLUNTEER_STATUS_LABELS,
  type ShiftSignupWithContext,
  type ShiftWithSignups,
  type VolunteerWithUser,
} from "@shelters/public.client";

interface Props {
  shifts: ShiftWithSignups[];
  volunteers: VolunteerWithUser[];
  signupsByShift: Record<string, ShiftSignupWithContext[]>;
}

type Tab = "shifts" | "volunteers" | "hours";

export function PlanningPanel({ shifts, volunteers, signupsByShift }: Props) {
  const [tab, setTab] = useState<Tab>("shifts");
  const [editingShift, setEditingShift] = useState<
    ShiftWithSignups | "new" | null
  >(null);

  const candidatures = volunteers.filter((v) => v.status === "candidature");
  const actives = volunteers.filter((v) => v.status === "active");
  const others = volunteers.filter(
    (v) => !["candidature", "active"].includes(v.status)
  );

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1.5 border-b border-border">
        <TabButton
          active={tab === "shifts"}
          onClick={() => setTab("shifts")}
          label="Créneaux"
          count={shifts.filter((s) => s.status === "ouvert").length}
        />
        <TabButton
          active={tab === "volunteers"}
          onClick={() => setTab("volunteers")}
          label="Bénévoles"
          count={candidatures.length}
        />
        <TabButton
          active={tab === "hours"}
          onClick={() => setTab("hours")}
          label="Heures"
        />
      </nav>

      {tab === "shifts" && (
        <ShiftsList
          shifts={shifts}
          signupsByShift={signupsByShift}
          onCreate={() => setEditingShift("new")}
          onEdit={(s) => setEditingShift(s)}
        />
      )}
      {tab === "volunteers" && (
        <VolunteersList
          candidatures={candidatures}
          actives={actives}
          others={others}
        />
      )}
      {tab === "hours" && <HoursTable volunteers={volunteers} />}

      {editingShift && (
        <ShiftDialog
          shift={editingShift === "new" ? null : editingShift}
          onClose={() => setEditingShift(null)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
        active
          ? "border-coral-500 text-coral-700"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
            active ? "bg-coral-600 text-white" : "bg-coral-100 text-coral-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ShiftsList({
  shifts,
  signupsByShift,
  onCreate,
  onEdit,
}: {
  shifts: ShiftWithSignups[];
  signupsByShift: Record<string, ShiftSignupWithContext[]>;
  onCreate: () => void;
  onEdit: (s: ShiftWithSignups) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau créneau
        </Button>
      </div>
      {shifts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun créneau planifié. Créez-en un pour permettre à vos bénévoles
          de s&apos;inscrire.
        </p>
      ) : (
        <ul className="space-y-3">
          {shifts.map((s) => (
            <ShiftRow
              key={s.id}
              shift={s}
              signups={signupsByShift[s.id] ?? []}
              onEdit={() => onEdit(s)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ShiftRow({
  shift,
  signups,
  onEdit,
}: {
  shift: ShiftWithSignups;
  signups: ShiftSignupWithContext[];
  onEdit: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const cl = SHIFT_STATUS_CLASSES[shift.status];

  function cancel() {
    if (!confirm("Annuler ce créneau ? Les inscrits seront prévenus implicitement."))
      return;
    startTransition(async () => {
      const result = await cancelShift(shift.id);
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("Créneau annulé.");
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Supprimer définitivement ce créneau ?")) return;
    startTransition(async () => {
      const result = await deleteShift(shift.id);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Créneau supprimé.");
      router.refresh();
    });
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{shift.title}</h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
            >
              {SHIFT_STATUS_LABELS[shift.status]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sable-100 px-2 py-0.5 text-[10px] font-bold text-foreground">
              {shift.signedUpCount}/{shift.capacity}
            </span>
          </div>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDateTime(shift.startsAt)} → {formatTime(shift.endsAt)}
          </p>
          {shift.description && (
            <p className="text-xs text-muted-foreground">{shift.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Masquer" : `Inscrits (${signups.length})`}
          </Button>
          {(shift.status === "ouvert" || shift.status === "complet") && (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
                Éditer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={cancel}
                disabled={isPending}
              >
                Annuler
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={isPending}
            aria-label="Supprimer le créneau"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          {signups.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun bénévole inscrit pour le moment.
            </p>
          ) : (
            <ul className="space-y-2">
              {signups.map((s) => (
                <SignupRow key={s.id} signup={s} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function SignupRow({ signup }: { signup: ShiftSignupWithContext }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hours = signupHours(signup);

  function doCheckIn() {
    startTransition(async () => {
      const r = await checkInSignup(signup.id);
      if (!r.success) toast.error(r.error ?? "Échec");
      else {
        toast.success("Arrivée enregistrée.");
        router.refresh();
      }
    });
  }
  function doCheckOut() {
    startTransition(async () => {
      const r = await checkOutSignup(signup.id);
      if (!r.success) toast.error(r.error ?? "Échec");
      else {
        toast.success("Départ enregistré.");
        router.refresh();
      }
    });
  }
  function doAbsent() {
    if (!confirm("Marquer ce bénévole comme absent ?")) return;
    startTransition(async () => {
      const r = await markSignupAbsent(signup.id);
      if (!r.success) toast.error(r.error ?? "Échec");
      else {
        toast.success("Marqué absent.");
        router.refresh();
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-2.5 text-xs">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <strong className="text-foreground">{signup.volunteerName}</strong>
          <span className="rounded-full bg-sable-100 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            {SHIFT_SIGNUP_STATUS_LABELS[signup.status]}
          </span>
        </div>
        <p className="text-muted-foreground">
          <Mail className="mr-1 inline h-2.5 w-2.5" />
          {signup.volunteerEmail}
          {signup.checkInAt && (
            <>
              {" · "}
              <Clock className="mr-1 inline h-2.5 w-2.5" />
              Arrivée {formatTime(signup.checkInAt)}
            </>
          )}
          {signup.checkOutAt && (
            <>
              {" → Départ "}
              {formatTime(signup.checkOutAt)}
              {hours > 0 && (
                <> · <strong className="text-foreground">{hours} h</strong></>
              )}
            </>
          )}
        </p>
      </div>
      <div className="flex gap-1.5">
        {!signup.checkInAt &&
          signup.status !== "absent" &&
          signup.status !== "annule" && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={doCheckIn}
                disabled={isPending}
              >
                <LogIn className="mr-1 h-3 w-3" />
                Arrivée
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={doAbsent}
                disabled={isPending}
                aria-label="Marquer comme absent"
              >
                <UserX className="h-3 w-3" aria-hidden="true" />
              </Button>
            </>
          )}
        {signup.checkInAt && !signup.checkOutAt && (
          <Button
            type="button"
            size="sm"
            onClick={doCheckOut}
            disabled={isPending}
          >
            <LogOut className="mr-1 h-3 w-3" />
            Départ
          </Button>
        )}
      </div>
    </li>
  );
}

function VolunteersList({
  candidatures,
  actives,
  others,
}: {
  candidatures: VolunteerWithUser[];
  actives: VolunteerWithUser[];
  others: VolunteerWithUser[];
}) {
  return (
    <div className="space-y-6">
      {candidatures.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-coral-700">
            À valider
          </h3>
          <ul className="space-y-3">
            {candidatures.map((v) => (
              <CandidatureRow key={v.id} volunteer={v} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Bénévoles actifs
        </h3>
        {actives.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            Aucun bénévole actif. Validez des candidatures pour démarrer.
          </p>
        ) : (
          <ul className="space-y-2">
            {actives.map((v) => (
              <ActiveVolunteerRow key={v.id} volunteer={v} />
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Archive
          </h3>
          <ul className="space-y-1.5">
            {others.map((v) => {
              const cl = VOLUNTEER_STATUS_CLASSES[v.status];
              return (
                <li
                  key={v.id}
                  className="rounded-md border border-border bg-card px-3 py-2 text-xs"
                >
                  <strong className="text-foreground">{v.userName}</strong>{" "}
                  <span
                    className={`ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
                  >
                    {VOLUNTEER_STATUS_LABELS[v.status]}
                  </span>
                  {v.rejectedReason && (
                    <span className="ml-2 italic text-muted-foreground">
                      Motif : {v.rejectedReason}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function CandidatureRow({ volunteer }: { volunteer: VolunteerWithUser }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "validate" | "reject">("idle");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function decide(action: "validate" | "reject") {
    startTransition(async () => {
      const fn = action === "validate" ? validateVolunteer : rejectVolunteer;
      const result = await fn({ id: volunteer.id, note });
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success(
        action === "validate" ? "Candidature validée." : "Candidature refusée."
      );
      router.refresh();
    });
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="space-y-1.5">
        <h4 className="font-semibold text-foreground">{volunteer.userName}</h4>
        <p className="inline-flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {volunteer.userEmail}
          </span>
          {volunteer.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {volunteer.phone}
            </span>
          )}
        </p>
        <p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-sable-50/40 p-2.5 text-xs text-foreground">
          {volunteer.motivation}
        </p>
        {volunteer.skills && (
          <p className="text-xs text-muted-foreground">
            <strong>Compétences :</strong> {volunteer.skills}
          </p>
        )}
        {volunteer.availability && (
          <p className="text-xs text-muted-foreground">
            <strong>Disponibilités :</strong> {volunteer.availability}
          </p>
        )}
      </div>

      {mode === "idle" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setMode("validate")}
            disabled={isPending}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Valider
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMode("reject")}
            disabled={isPending}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Refuser
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
          <Label className="text-xs">
            {mode === "validate"
              ? "Message d'accueil (facultatif)"
              : "Motif du refus (facultatif)"}
          </Label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => decide(mode)}
              disabled={isPending}
            >
              Confirmer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setMode("idle");
                setNote("");
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function ActiveVolunteerRow({ volunteer }: { volunteer: VolunteerWithUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = volunteer.status === "active" ? "pause" : "active";
    startTransition(async () => {
      const r = await setVolunteerStatus(volunteer.id, next);
      if (!r.success) toast.error(r.error ?? "Action impossible.");
      else {
        toast.success(next === "pause" ? "Mis en pause." : "Réactivé.");
        router.refresh();
      }
    });
  }
  function archive() {
    if (!confirm("Archiver ce bénévole ?")) return;
    startTransition(async () => {
      const r = await setVolunteerStatus(volunteer.id, "archive");
      if (!r.success) toast.error(r.error ?? "Action impossible.");
      else {
        toast.success("Archivé.");
        router.refresh();
      }
    });
  }

  const cl = VOLUNTEER_STATUS_CLASSES[volunteer.status];

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-foreground">{volunteer.userName}</strong>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
            >
              {VOLUNTEER_STATUS_LABELS[volunteer.status]}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {volunteer.totalHours} h
            </span>
            {volunteer.upcomingShiftsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-coral-700">
                <Calendar className="h-3 w-3" />
                {volunteer.upcomingShiftsCount} créneau
                {volunteer.upcomingShiftsCount > 1 ? "x" : ""} à venir
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {volunteer.userEmail}
            {volunteer.phone && ` · ${volunteer.phone}`}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggle}
            disabled={isPending}
          >
            {volunteer.status === "active" ? (
              <>
                <Pause className="mr-1 h-3 w-3" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-1 h-3 w-3" />
                Réactiver
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={archive}
            disabled={isPending}
            aria-label="Archiver ce bénévole"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function HoursTable({ volunteers }: { volunteers: VolunteerWithUser[] }) {
  const sorted = [...volunteers]
    .filter((v) => v.totalHours > 0 || v.upcomingShiftsCount > 0)
    .sort((a, b) => b.totalHours - a.totalHours);
  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Aucune heure comptabilisée. Elles apparaîtront après les premiers
        check-out de bénévoles.
      </p>
    );
  }
  return (
    <table className="w-full overflow-hidden rounded-xl border border-border bg-card text-sm">
      <thead className="bg-sable-50">
        <tr>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bénévole
          </th>
          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Heures effectuées
          </th>
          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            À venir
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((v) => (
          <tr key={v.id} className="border-t border-border">
            <td className="px-4 py-2 text-foreground">{v.userName}</td>
            <td className="px-4 py-2 text-right font-mono text-foreground">
              {v.totalHours} h
            </td>
            <td className="px-4 py-2 text-right text-muted-foreground">
              {v.upcomingShiftsCount}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShiftDialog({
  shift,
  onClose,
}: {
  shift: ShiftWithSignups | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

  const [title, setTitle] = useState(shift?.title ?? "");
  const [description, setDescription] = useState(shift?.description ?? "");
  const [startsAt, setStartsAt] = useState(
    shift ? toLocalInput(shift.startsAt) : toLocalInput(today)
  );
  const [endsAt, setEndsAt] = useState(
    shift
      ? toLocalInput(shift.endsAt)
      : toLocalInput(new Date(today.getTime() + 2 * 3600000))
  );
  const [capacity, setCapacity] = useState(shift?.capacity ?? 2);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await upsertShift({
        id: shift?.id,
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        capacity,
      });
      if (!result.success) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success(shift ? "Créneau mis à jour." : "Créneau créé.");
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {shift ? "Modifier le créneau" : "Nouveau créneau"}
          </h2>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div>
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Balade chiens, soins chats, accueil public…"
            maxLength={255}
          />
        </div>

        <div>
          <Label htmlFor="description">Description (facultatif)</Label>
          <Textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Apporter sa propre eau, tenue souple…"
            maxLength={2000}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="starts">Début</Label>
            <Input
              id="starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ends">Fin</Label>
            <Input
              id="ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="capacity">Capacité (nombre de bénévoles max)</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            {shift ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </div>
    </div>
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

function toLocalInput(d: Date): string {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
}
