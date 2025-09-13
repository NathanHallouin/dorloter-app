import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  eventsApi, volunteeringApi, shelterApi, useAuth,
  type EventType, type ShiftKind, type ShelterEvent, type VolunteerShift,
  type EventSignup, type ShiftSignup,
} from "@dorloter/client";
import { cn, Icon, Pill, Btn, DatePicker, Segmented } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn, field, Select } from "@/components/dash/kit";

const EVENT_TYPE: Record<EventType, string> = {
  collecte: "Collecte", journee_adoption: "Journée d'adoption", porte_ouverte: "Porte ouverte",
  marche: "Marché", sensibilisation: "Sensibilisation", autre: "Autre",
};
const SHIFT_KIND: Record<ShiftKind, string> = {
  permanence: "Permanence", promenade: "Promenade", nettoyage: "Nettoyage",
  accueil: "Accueil", transport: "Transport", autre: "Autre",
};
const EVENT_TYPES = Object.keys(EVENT_TYPE) as EventType[];
const SHIFT_KINDS = Object.keys(SHIFT_KIND) as ShiftKind[];
const SIGN: Record<string, string> = { inscrit: "Inscrit", present: "Présent", absent: "Absent" };
const WEEKDAYS = ["lu", "ma", "me", "je", "ve", "sa", "di"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayKey = (ts: string) => isoOf(new Date(ts));
const TIMES = Array.from({ length: (22 - 6) * 2 }, (_, i) => {
  const t = `${pad(6 + Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`;
  return { value: t, label: t };
});
const timeOf = (ts: string) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (ts: string) => new Date(ts).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Item = {
  kind: "event" | "shift";
  id: string;
  title: string;
  label: string;
  startsAt: string;
  location: string | null;
  capacity: number | null;
  event?: ShelterEvent;
  shift?: VolunteerShift;
};

export function ShelterEventsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [open, setOpen] = useState<{ kind: "event" | "shift"; id: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createKind, setCreateKind] = useState<"event" | "shift">("event");
  const [error, setError] = useState<string | null>(null);

  const events = useQuery({ queryKey: ["events"], queryFn: () => eventsApi.list() });
  const shifts = useQuery({ queryKey: ["shifts"], queryFn: () => volunteeringApi.listShifts() });
  const volunteers = useQuery({ queryKey: ["volunteers"], queryFn: () => volunteeringApi.listVolunteers() });
  const members = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });
  const evSignups = useQuery({ queryKey: ["event-signups", open?.id], queryFn: () => eventsApi.listSignups(open!.id), enabled: open?.kind === "event" });
  const shSignups = useQuery({ queryKey: ["signups", open?.id], queryFn: () => volunteeringApi.listSignups(open!.id), enabled: open?.kind === "shift" });

  const myRole = members.data?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "gestionnaire";
  const vols = volunteers.data ?? [];

  const invEvents = () => qc.invalidateQueries({ queryKey: ["events"] });
  const invShifts = () => qc.invalidateQueries({ queryKey: ["shifts"] });
  const invSignups = () => qc.invalidateQueries({ queryKey: [open?.kind === "event" ? "event-signups" : "signups", open?.id] });

  const createEvent = useMutation({ mutationFn: eventsApi.create, onSuccess: () => { setShowCreate(false); invEvents(); } });
  const createShift = useMutation({ mutationFn: volunteeringApi.createShift, onSuccess: () => { setShowCreate(false); invShifts(); } });
  const delEvent = useMutation({ mutationFn: (id: string) => eventsApi.remove(id), onSuccess: invEvents });
  const delShift = useMutation({ mutationFn: (id: string) => volunteeringApi.removeShift(id), onSuccess: invShifts });
  const saveResult = useMutation({ mutationFn: (v: { id: string; amount?: number; notes?: string }) => eventsApi.update(v.id, { resultAmount: v.amount, resultNotes: v.notes }), onSuccess: invEvents });
  const evSignup = useMutation({ mutationFn: (v: { id: string; volId: string }) => eventsApi.signup(v.id, v.volId), onSuccess: invSignups });
  const shSignup = useMutation({ mutationFn: (v: { id: string; volId: string }) => volunteeringApi.signup(v.id, v.volId), onSuccess: invSignups });
  const evUpd = useMutation({ mutationFn: (v: { id: string; status: string }) => eventsApi.updateSignup(v.id, v.status), onSuccess: invSignups });
  const shUpd = useMutation({ mutationFn: (v: { id: string; status: SignupLike; hours?: number }) => volunteeringApi.updateSignup(v.id, { status: v.status, hours: v.hours }), onSuccess: invSignups });
  const evDelSu = useMutation({ mutationFn: (id: string) => eventsApi.removeSignup(id), onSuccess: invSignups });
  const shDelSu = useMutation({ mutationFn: (id: string) => volunteeringApi.removeSignup(id), onSuccess: invSignups });

  const items: Item[] = [
    ...(events.data ?? []).map((e): Item => ({ kind: "event", id: e.id, title: e.title, label: EVENT_TYPE[e.type], startsAt: e.startsAt, location: e.location, capacity: e.capacity, event: e })),
    ...(shifts.data ?? []).map((s): Item => ({ kind: "shift", id: s.id, title: s.title, label: SHIFT_KIND[s.kind], startsAt: s.startsAt, location: s.location, capacity: s.capacity, shift: s })),
  ];

  const byDay = new Map<string, { e: number; s: number }>();
  for (const it of items) {
    const k = dayKey(it.startsAt);
    const c = byDay.get(k) ?? { e: 0, s: 0 };
    if (it.kind === "event") c.e++; else c.s++;
    byDay.set(k, c);
  }

  const now = Date.now();
  const visible = items
    .filter((it) => selectedDay ? dayKey(it.startsAt) === selectedDay : +new Date(it.startsAt) >= now - 12 * 3600 * 1000)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date = String(f.get("date") || "");
    const time = String(f.get("time") || "09:00");
    if (!date) { setError("Choisissez une date."); return; }
    setError(null);
    const startsAt = new Date(`${date}T${time}`).toISOString();
    const str = (k: string) => (f.get(k) ? String(f.get(k)) : undefined);
    const capacity = f.get("capacity") ? Number(f.get("capacity")) : undefined;
    if (createKind === "event") {
      createEvent.mutate({ title: String(f.get("title") ?? ""), type: (f.get("type") as EventType) || "collecte", startsAt, location: str("location"), capacity, isPublic: f.get("isPublic") === "on", needs: str("needs") });
    } else {
      createShift.mutate({ title: String(f.get("title") ?? ""), kind: (f.get("kind") as ShiftKind) || "permanence", startsAt, location: str("location"), capacity });
    }
  }

  return (
    <div>
      <DashPageHead title="Agenda" desc="Le calendrier du refuge : événements (collectes, journées d'adoption…) et permanences des bénévoles, au même endroit."
        action={canManage ? <Btn icon={showCreate ? "x" : "plus"} variant={showCreate ? "outline" : "primary"} onClick={() => setShowCreate((v) => !v)}>{showCreate ? "Fermer" : "Ajouter"}</Btn> : undefined} />

      {(events.isError || shifts.isError) && <p className="mb-3 text-brick-600">Accès refuge requis.</p>}
      {error && <p className="mb-3 text-[13px] text-brick-600">{error}</p>}

      {showCreate && canManage && (
        <div className="mb-5">
        <Panel title="Ajouter à l'agenda">
          <Segmented value={createKind} onChange={(v) => setCreateKind(v as "event" | "shift")}
            options={[{ value: "event", label: "Événement", icon: "map" }, { value: "shift", label: "Permanence", icon: "clock" }]} />
          <form onSubmit={onCreate} className="mt-3 grid gap-2 md:grid-cols-6">
            <input name="title" required placeholder="Intitulé" className={cn(field, "md:col-span-3")} />
            {createKind === "event"
              ? <Select name="type" defaultValue="collecte" options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE[t] }))} className="md:col-span-3" />
              : <Select name="kind" defaultValue="permanence" options={SHIFT_KINDS.map((k) => ({ value: k, label: SHIFT_KIND[k] }))} className="md:col-span-3" />}
            <div className="md:col-span-2"><DatePicker name="date" dense placeholder="Date" defaultValue={selectedDay ?? isoOf(new Date())} /></div>
            <Select name="time" defaultValue="09:00" options={TIMES} className="md:col-span-2" />
            <input name="capacity" type="number" min="1" placeholder={createKind === "event" ? "Bénévoles attendus" : "Places"} className={cn(field, "md:col-span-2")} />
            <input name="location" placeholder="Lieu" className={cn(field, createKind === "event" ? "md:col-span-3" : "md:col-span-6")} />
            {createKind === "event" && <>
              <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-3"><input type="checkbox" name="isPublic" /> Visible sur le site public</label>
              <input name="needs" placeholder="Besoins (croquettes, bénévoles…)" className={cn(field, "md:col-span-6")} />
            </>}
            <div className="md:col-span-6"><MiniBtn label={createKind === "event" ? "Créer l'événement" : "Créer la permanence"} icon="check" tone="green" /></div>
          </form>
        </Panel>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        {/* Calendrier */}
        <Panel pad={false}>
          <MonthCalendar month={month} onMonth={setMonth} byDay={byDay}
            selectedDay={selectedDay} onSelectDay={(d) => { setSelectedDay(d); setOpen(null); }} />
        </Panel>

        {/* Liste */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-coral-700">
              {selectedDay ? cap(new Date(selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })) : "À venir"}
            </h2>
            {selectedDay && <button onClick={() => setSelectedDay(null)} className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground hover:text-foreground">Tout voir</button>}
          </div>

          {(events.isLoading || shifts.isLoading) && [0, 1].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-card border border-line bg-card" />)}

          {!events.isLoading && visible.length === 0 && (
            <div className="rounded-card border border-dashed border-line py-10 text-center text-muted-foreground">
              {selectedDay ? "Rien de prévu ce jour." : "Aucun événement ni permanence à venir."}
            </div>
          )}

          {visible.map((it) => (
            <AgendaCard key={`${it.kind}-${it.id}`} it={it} canManage={canManage} vols={vols}
              isOpen={open?.kind === it.kind && open.id === it.id}
              onToggle={() => setOpen(open?.kind === it.kind && open.id === it.id ? null : { kind: it.kind, id: it.id })}
              signups={open?.kind === it.kind && open.id === it.id ? (it.kind === "event" ? evSignups.data : shSignups.data) : undefined}
              onSignup={(volId) => (it.kind === "event" ? evSignup : shSignup).mutate({ id: it.id, volId })}
              onPresent={(suId, hours) => it.kind === "event" ? evUpd.mutate({ id: suId, status: "present" }) : shUpd.mutate({ id: suId, status: "present", hours: hours ?? 2 })}
              onAbsent={(suId) => it.kind === "event" ? evUpd.mutate({ id: suId, status: "absent" }) : shUpd.mutate({ id: suId, status: "absent" })}
              onRemoveSignup={(suId) => (it.kind === "event" ? evDelSu : shDelSu).mutate(suId)}
              onDelete={() => (it.kind === "event" ? delEvent : delShift).mutate(it.id)}
              onSaveResult={(amount, notes) => saveResult.mutate({ id: it.id, amount, notes })} />
          ))}
        </div>
      </div>
    </div>
  );
}

type SignupLike = "inscrit" | "present" | "absent";

/* ------------------------------- Calendrier -------------------------------- */
function MonthCalendar({ month, onMonth, byDay, selectedDay, onSelectDay }: {
  month: Date; onMonth: (d: Date) => void; byDay: Map<string, { e: number; s: number }>;
  selectedDay: string | null; onSelectDay: (d: string | null) => void;
}) {
  const y = month.getFullYear(), m = month.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - offset + i));
  const todayISO = isoOf(new Date());
  const label = cap(month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));

  return (
    <div className="p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => onMonth(new Date(y, m - 1, 1))} aria-label="Mois précédent" className="grid h-8 w-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-muted hover:text-foreground"><Icon name="chevron" size={16} className="rotate-180" /></button>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground">{label}</span>
          <button onClick={() => { onMonth(new Date()); onSelectDay(todayISO); }} className="font-mono rounded-[6px] border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground hover:text-foreground">Auj.</button>
        </div>
        <button onClick={() => onMonth(new Date(y, m + 1, 1))} aria-label="Mois suivant" className="grid h-8 w-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-muted hover:text-foreground"><Icon name="chevron" size={16} /></button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => <span key={d} className="font-mono grid h-6 place-items-center text-[10px] font-semibold uppercase text-muted-foreground">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const k = isoOf(cell);
          const inMonth = cell.getMonth() === m;
          const sel = k === selectedDay;
          const today = k === todayISO;
          const counts = byDay.get(k);
          return (
            <button key={k} onClick={() => onSelectDay(sel ? null : k)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-[8px] text-[13px] transition-colors",
                sel ? "bg-coral-600 text-sable-50" : cn(inMonth ? "text-foreground" : "text-muted-foreground/40", "hover:bg-muted", today && "ring-1 ring-inset ring-coral-400"),
              )}>
              <span className={cn(today && !sel && "font-bold text-coral-700 dark:text-coral-200")}>{cell.getDate()}</span>
              {counts && (
                <span className="flex gap-0.5">
                  {counts.e > 0 && <span className={cn("h-1.5 w-1.5 rounded-full", sel ? "bg-sable-50" : "bg-coral-500")} />}
                  {counts.s > 0 && <span className={cn("h-1.5 w-1.5 rounded-full", sel ? "bg-sable-50/70" : "bg-lavande-500")} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="font-mono mt-3 flex items-center gap-3 border-t border-line pt-2.5 text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-coral-500" /> Événement</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-lavande-500" /> Permanence</span>
      </div>
    </div>
  );
}

/* ------------------------------- Agenda card ------------------------------- */
function AgendaCard({ it, canManage, vols, isOpen, onToggle, signups, onSignup, onPresent, onAbsent, onRemoveSignup, onDelete, onSaveResult }: {
  it: Item; canManage: boolean; vols: { id: string; name: string }[]; isOpen: boolean; onToggle: () => void;
  signups?: (EventSignup | ShiftSignup)[];
  onSignup: (volId: string) => void;
  onPresent: (signupId: string, hours?: number) => void;
  onAbsent: (signupId: string) => void;
  onRemoveSignup: (signupId: string) => void;
  onDelete: () => void;
  onSaveResult: (amount?: number, notes?: string) => void;
}) {
  const [pick, setPick] = useState("");
  const [confirm, setConfirm] = useState(false);
  const list = signups ?? [];
  const taken = new Set(list.map((su) => su.volunteerName));
  const free = vols.filter((v) => !taken.has(v.name));
  const ev = it.event;

  return (
    <div className="rounded-card border border-line bg-card p-3.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={cn("h-2.5 w-2.5 flex-none rounded-full", it.kind === "event" ? "bg-coral-500" : "bg-lavande-500")} />
        <span className="font-semibold text-foreground">{it.title}</span>
        <Pill tone={it.kind === "event" ? "coral" : "lavande"}>{it.label}</Pill>
        {ev?.isPublic && <Pill tone="prune">Public</Pill>}
        <span className="mono text-[12px] text-muted-foreground">{dayLabel(it.startsAt)} · {timeOf(it.startsAt)}</span>
        {it.location && <span className="text-muted-foreground">· {it.location}</span>}
        {it.capacity != null && <span className="mono text-[12px] text-muted-foreground">· {isOpen ? `${list.length}/${it.capacity}` : it.capacity} pl.</span>}
        {ev?.resultAmount != null && <span className="text-[12px] text-coral-700">· bilan {ev.resultAmount} €</span>}
        <div className="ml-auto flex items-center gap-2">
          <MiniBtn label={isOpen ? "Masquer" : "Gérer"} icon="users" onClick={onToggle} />
          {canManage && (confirm
            ? <div className="flex items-center gap-1.5"><MiniBtn icon="trash" tone="brick" label="Supprimer" onClick={() => { onDelete(); setConfirm(false); }} /><MiniBtn label="Annuler" onClick={() => setConfirm(false)} /></div>
            : <MiniBtn icon="trash" tone="brick" onClick={() => setConfirm(true)} />)}
        </div>
      </div>
      {ev?.needs && <p className="mt-1 text-[13px] text-muted-foreground">Besoins : {ev.needs}</p>}

      {isOpen && (
        <div className={cn("mt-3 grid gap-4 border-t border-line pt-3", it.kind === "event" && "md:grid-cols-2")}>
          <div>
            <div className="mono mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Bénévoles inscrits</div>
            {canManage && (
              <div className="mb-2 flex items-center gap-2">
                <Select value={pick} onChange={setPick} placeholder="Inscrire un bénévole…" options={free.map((v) => ({ value: v.id, label: v.name }))} className="max-w-[220px]" />
                <MiniBtn label="Inscrire" icon="check" onClick={() => { if (pick) { onSignup(pick); setPick(""); } }} disabled={!pick} />
              </div>
            )}
            {list.length === 0 ? <p className="text-sm text-muted-foreground">Aucune inscription.</p> : (
              <ul className="flex flex-col gap-1.5">
                {list.map((su) => (
                  <li key={su.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">{su.volunteerName}</span>
                    <Pill tone={su.status === "present" ? "green" : su.status === "absent" ? "brick" : "sable"}>{SIGN[su.status]}</Pill>
                    {"hours" in su && su.hours != null && su.status === "present" && <span className="mono text-[12px] text-muted-foreground">{su.hours} h</span>}
                    {canManage && (
                      <div className="ml-auto flex items-center gap-2">
                        {su.status !== "present" && <button type="button" onClick={() => onPresent(su.id, "hours" in su ? su.hours ?? undefined : undefined)} className="text-xs text-coral-700 hover:underline">Présent</button>}
                        {su.status !== "absent" && <button type="button" onClick={() => onAbsent(su.id)} className="text-xs text-muted-foreground hover:underline">Absent</button>}
                        <button type="button" onClick={() => onRemoveSignup(su.id)} className="text-xs text-brick-600 hover:underline">Retirer</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {it.kind === "event" && canManage && (
            <div>
              <div className="mono mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Bilan (collecte)</div>
              <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); onSaveResult(f.get("amount") ? Number(f.get("amount")) : undefined, f.get("notes") ? String(f.get("notes")) : undefined); }} className="grid gap-2">
                <input name="amount" type="number" step="0.01" min="0" defaultValue={ev?.resultAmount ?? ""} placeholder="Montant collecté (€)" className={field} />
                <input name="notes" defaultValue={ev?.resultNotes ?? ""} placeholder="En nature (kg croquettes, matériel…)" className={field} />
                <div><MiniBtn label="Enregistrer le bilan" icon="check" tone="green" /></div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
