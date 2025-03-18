"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  Cat,
  Check,
  Dog,
  Home,
  Mail,
  Pause,
  Phone,
  Play,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  cancelFosterPlacement,
  createFosterPlacement,
  endFosterPlacement,
  rejectFosterFamily,
  setFosterFamilyStatus,
  validateFosterFamily,
  FOSTER_FAMILY_STATUS_CLASSES,
  FOSTER_FAMILY_STATUS_LABELS,
  FOSTER_PLACEMENT_STATUS_CLASSES,
  FOSTER_PLACEMENT_STATUS_LABELS,
  type FosterFamilyWithUser,
  type FosterPlacementWithContext,
} from "@shelters/public.client";

interface Props {
  families: FosterFamilyWithUser[];
  placements: FosterPlacementWithContext[];
  availablePets: Array<{ id: string; name: string; species: "chat" | "chien" }>;
}

type Tab = "candidatures" | "actives" | "placements" | "archive";

export function FosterFamiliesPanel({
  families,
  placements,
  availablePets,
}: Props) {
  const [tab, setTab] = useState<Tab>(() =>
    families.some((f) => f.status === "candidature")
      ? "candidatures"
      : placements.length > 0
        ? "placements"
        : "actives"
  );
  const [placementFor, setPlacementFor] = useState<FosterFamilyWithUser | null>(
    null
  );

  const candidatures = families.filter((f) => f.status === "candidature");
  const actives = families.filter((f) =>
    ["active", "pause"].includes(f.status)
  );
  const archived = families.filter((f) =>
    ["refusee", "archive"].includes(f.status)
  );

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1.5 border-b border-border">
        <TabButton
          active={tab === "candidatures"}
          onClick={() => setTab("candidatures")}
          label="Candidatures"
          count={candidatures.length}
        />
        <TabButton
          active={tab === "actives"}
          onClick={() => setTab("actives")}
          label="FA actives"
          count={actives.length}
        />
        <TabButton
          active={tab === "placements"}
          onClick={() => setTab("placements")}
          label="Placements en cours"
          count={placements.length}
        />
        <TabButton
          active={tab === "archive"}
          onClick={() => setTab("archive")}
          label="Archive"
          count={archived.length}
        />
      </nav>

      {tab === "candidatures" && (
        <CandidaturesList families={candidatures} />
      )}
      {tab === "actives" && (
        <ActivesList
          families={actives}
          onPlace={(f) => setPlacementFor(f)}
          canPlace={availablePets.length > 0}
        />
      )}
      {tab === "placements" && <PlacementsList placements={placements} />}
      {tab === "archive" && <ArchivedList families={archived} />}

      {placementFor && (
        <PlacementDialog
          family={placementFor}
          availablePets={availablePets}
          onClose={() => setPlacementFor(null)}
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
  count: number;
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
      {count > 0 && (
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
            active
              ? "bg-coral-600 text-white"
              : "bg-coral-100 text-coral-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function CandidaturesList({
  families,
}: {
  families: FosterFamilyWithUser[];
}) {
  if (families.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Aucune candidature en attente.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {families.map((f) => (
        <CandidatureRow key={f.id} family={f} />
      ))}
    </ul>
  );
}

function CandidatureRow({ family }: { family: FosterFamilyWithUser }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"idle" | "validate" | "reject">("idle");
  const [isPending, startTransition] = useTransition();

  function decide(action: "validate" | "reject") {
    startTransition(async () => {
      const fn = action === "validate" ? validateFosterFamily : rejectFosterFamily;
      const result = await fn({ id: family.id, note });
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="font-semibold text-foreground">{family.userName}</h3>
          <p className="inline-flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {family.userEmail}
            </span>
            {family.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {family.phone}
              </span>
            )}
          </p>
          <SpeciesAndCapacityRow family={family} />
          <p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-sable-50/40 p-2.5 text-xs text-foreground">
            {family.motivation}
          </p>
          {family.experience && (
            <p className="text-xs text-muted-foreground">
              <strong>Expérience :</strong> {family.experience}
            </p>
          )}
        </div>
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
          <Label htmlFor={`note-${family.id}`} className="text-xs">
            {mode === "validate"
              ? "Message d'accueil (facultatif)"
              : "Motif du refus (facultatif)"}
          </Label>
          <Textarea
            id={`note-${family.id}`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              mode === "validate"
                ? "Bienvenue, prochaine étape… (envoyé par email)"
                : "Pourquoi le refuge ne donne pas suite (envoyé par email)"
            }
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

function SpeciesAndCapacityRow({ family }: { family: FosterFamilyWithUser }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1 rounded-full bg-sable-100 px-2 py-0.5 text-[11px] font-medium text-foreground">
        Capacité {family.maxCapacity}
      </span>
      {family.acceptsCats && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Cat className="h-3 w-3" />
          Chats
        </span>
      )}
      {family.acceptsDogs && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Dog className="h-3 w-3" />
          Chiens
        </span>
      )}
      {family.hasGarden && (
        <span className="text-muted-foreground">· Jardin</span>
      )}
      {family.hasChildren && (
        <span className="text-muted-foreground">
          · Enfants{family.childrenAges ? ` (${family.childrenAges})` : ""}
        </span>
      )}
      {family.hasOtherPets && (
        <span className="text-muted-foreground">· Autres animaux</span>
      )}
    </div>
  );
}

function ActivesList({
  families,
  onPlace,
  canPlace,
}: {
  families: FosterFamilyWithUser[];
  onPlace: (f: FosterFamilyWithUser) => void;
  canPlace: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (families.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Aucune famille d&apos;accueil active. Validez des candidatures pour
        commencer.
      </p>
    );
  }

  function toggleStatus(f: FosterFamilyWithUser) {
    const next = f.status === "active" ? "pause" : "active";
    startTransition(async () => {
      const result = await setFosterFamilyStatus(f.id, next);
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success(next === "pause" ? "FA mise en pause." : "FA réactivée.");
      router.refresh();
    });
  }

  function archive(f: FosterFamilyWithUser) {
    if (
      !confirm(
        `Archiver ${f.userName} ? Elle ne pourra plus recevoir de placements.`
      )
    )
      return;
    startTransition(async () => {
      const result = await setFosterFamilyStatus(f.id, "archive");
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("FA archivée.");
      router.refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {families.map((f) => {
        const cl = FOSTER_FAMILY_STATUS_CLASSES[f.status];
        return (
          <li key={f.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {f.userName}
                  </h3>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
                  >
                    {FOSTER_FAMILY_STATUS_LABELS[f.status]}
                  </span>
                  {f.activePlacementsCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Home className="h-2.5 w-2.5" />
                      {f.activePlacementsCount} placement
                      {f.activePlacementsCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="inline-flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {f.userEmail}
                  </span>
                  {f.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {f.phone}
                    </span>
                  )}
                </p>
                <SpeciesAndCapacityRow family={f} />
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {f.status === "active" && canPlace && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onPlace(f)}
                    disabled={isPending}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Placer un animal
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleStatus(f)}
                  disabled={isPending}
                >
                  {f.status === "active" ? (
                    <>
                      <Pause className="mr-1 h-3.5 w-3.5" />
                      Mettre en pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 h-3.5 w-3.5" />
                      Réactiver
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => archive(f)}
                  disabled={isPending || f.activePlacementsCount > 0}
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PlacementsList({
  placements,
}: {
  placements: FosterPlacementWithContext[];
}) {
  const router = useRouter();
  const [endingId, setEndingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [isPending, startTransition] = useTransition();

  if (placements.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Aucun placement en cours.
      </p>
    );
  }

  function cancel(id: string) {
    if (!confirm("Annuler ce placement planifié ?")) return;
    startTransition(async () => {
      const result = await cancelFosterPlacement(id);
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("Placement annulé.");
      router.refresh();
    });
  }

  function submitEnd() {
    if (!endingId) return;
    startTransition(async () => {
      const result = await endFosterPlacement({
        id: endingId,
        actualEndDate: actualEnd,
        fosterFeedback: feedback,
      });
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("Placement clôturé.");
      setEndingId(null);
      setFeedback("");
      setActualEnd("");
      router.refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {placements.map((p) => {
        const cl = FOSTER_PLACEMENT_STATUS_CLASSES[p.status];
        return (
          <li key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {p.petName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {p.petSpecies}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
                  >
                    {FOSTER_PLACEMENT_STATUS_LABELS[p.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chez <strong className="text-foreground">{p.fosterUserName}</strong>{" "}
                  · du {formatDate(p.startDate)}
                  {p.expectedEndDate && ` au ${formatDate(p.expectedEndDate)} (prévu)`}
                </p>
                {p.reason && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Motif :</strong> {p.reason}
                  </p>
                )}
                {p.shelterNotes && (
                  <p className="text-xs italic text-muted-foreground">
                    {p.shelterNotes}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {p.status === "planifie" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => cancel(p.id)}
                    disabled={isPending}
                  >
                    Annuler
                  </Button>
                )}
                {p.status === "en_cours" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEndingId(p.id);
                      setActualEnd(new Date().toISOString().slice(0, 10));
                      setFeedback("");
                    }}
                    disabled={isPending}
                  >
                    Clôturer
                  </Button>
                )}
              </div>
            </div>

            {endingId === p.id && (
              <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
                <div>
                  <Label htmlFor={`end-${p.id}`} className="text-xs">
                    Date effective de fin
                  </Label>
                  <Input
                    id={`end-${p.id}`}
                    type="date"
                    value={actualEnd}
                    onChange={(e) => setActualEnd(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`fb-${p.id}`} className="text-xs">
                    Bilan FA (facultatif)
                  </Label>
                  <Textarea
                    id={`fb-${p.id}`}
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Retour de la famille d'accueil sur le séjour"
                    maxLength={2000}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={submitEnd}
                    disabled={isPending}
                  >
                    Valider la clôture
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEndingId(null)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ArchivedList({ families }: { families: FosterFamilyWithUser[] }) {
  if (families.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Aucune candidature refusée ou FA archivée.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {families.map((f) => {
        const cl = FOSTER_FAMILY_STATUS_CLASSES[f.status];
        return (
          <li
            key={f.id}
            className="rounded-xl border border-border bg-card p-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{f.userName}</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
              >
                {FOSTER_FAMILY_STATUS_LABELS[f.status]}
              </span>
              <span className="text-xs text-muted-foreground">
                {f.userEmail}
              </span>
            </div>
            {f.rejectedReason && (
              <p className="mt-1 text-xs italic text-muted-foreground">
                Motif : {f.rejectedReason}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PlacementDialog({
  family,
  availablePets,
  onClose,
}: {
  family: FosterFamilyWithUser;
  availablePets: Array<{ id: string; name: string; species: "chat" | "chien" }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [petId, setPetId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [shelterNotes, setShelterNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = availablePets.filter(
    (p) =>
      (p.species === "chat" && family.acceptsCats) ||
      (p.species === "chien" && family.acceptsDogs)
  );

  function submit() {
    if (!petId) {
      toast.error("Sélectionnez un animal.");
      return;
    }
    startTransition(async () => {
      const result = await createFosterPlacement({
        petId,
        fosterFamilyId: family.id,
        startDate,
        expectedEndDate,
        reason,
        shelterNotes,
      });
      if (!result.success) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      toast.success("Placement créé.");
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
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-coral-500" />
            Placer un animal chez {family.userName}
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
          <Label htmlFor="pet-select">Animal</Label>
          <select
            id="pet-select"
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">Choisir un animal…</option>
            {filtered.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.species})
              </option>
            ))}
          </select>
          {filtered.length === 0 && (
            <p className="mt-1 text-xs text-rose-700">
              Aucun animal disponible compatible avec les espèces de cette FA.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="start-date">Début</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="end-date">Fin prévue (facultatif)</Label>
            <Input
              id="end-date"
              type="date"
              value={expectedEndDate}
              onChange={(e) => setExpectedEndDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reason">Motif</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sociabilisation, post-opératoire, manque de place…"
            maxLength={1000}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (internes au refuge)</Label>
          <Textarea
            id="notes"
            rows={3}
            value={shelterNotes}
            onChange={(e) => setShelterNotes(e.target.value)}
            maxLength={2000}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || !petId}>
            Créer le placement
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
