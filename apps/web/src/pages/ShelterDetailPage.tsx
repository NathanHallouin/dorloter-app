import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sheltersApi } from "@dorloter/client";
import { petsApi } from "@dorloter/client";
import { myFosterApi } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { useAuth } from "@dorloter/client";
import { PetCard } from "@/components/PetCard";
import { Icon } from "@dorloter/ui";
import { Btn, Rule } from "@dorloter/ui";
import { Field, Input, Textarea } from "@dorloter/ui";
import { ReportContentButton } from "@/components/ReportContentButton";

const EVENT_TYPE: Record<string, string> = {
  collecte: "Collecte", journee_adoption: "Journée d'adoption", porte_ouverte: "Porte ouverte",
  marche: "Marché", sensibilisation: "Sensibilisation", autre: "Événement",
};
const NEED_CAT: Record<string, string> = {
  alimentation: "Alimentation", litiere: "Litière", medical: "Médical", materiel: "Matériel", autre: "Divers",
};
const eventWhen = (s: string) => {
  const d = new Date(s);
  return `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ShelterDetailPage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const [followed, setFollowed] = useState(false);
  const [showFoster, setShowFoster] = useState(false);
  const [fosterForm, setFosterForm] = useState({ city: "", capacity: 1, acceptsCats: true, acceptsDogs: true, notes: "" });
  const [fosterError, setFosterError] = useState<string | null>(null);
  const [showVolunteer, setShowVolunteer] = useState(false);
  const [volForm, setVolForm] = useState({ skills: "", availability: "", message: "" });
  const [volError, setVolError] = useState<string | null>(null);

  const { data: s, isLoading, isError } = useQuery({ queryKey: ["shelter", slug], queryFn: () => sheltersApi.get(slug), enabled: slug !== "" });
  const petsQuery = useQuery({ queryKey: ["shelter-pets-public", s?.id], queryFn: () => petsApi.list({ shelterId: s!.id, limit: 8 }), enabled: !!s });
  const eventsQuery = useQuery({ queryKey: ["shelter-events-public", slug], queryFn: () => sheltersApi.events(slug), enabled: slug !== "" });
  const needsQuery = useQuery({ queryKey: ["shelter-needs-public", slug], queryFn: () => sheltersApi.needs(slug), enabled: slug !== "" });

  const follow = useMutation({ mutationFn: () => sheltersApi.follow(s!.id), onSuccess: () => setFollowed(true) });
  const requestFoster = useMutation({
    mutationFn: () => myFosterApi.request(s!.id, fosterForm),
    onSuccess: () => { setShowFoster(false); setFosterError(null); },
    onError: (e) => setFosterError(e instanceof ApiClientError ? e.message : "Demande impossible."),
  });
  const applyVolunteer = useMutation({
    mutationFn: () => sheltersApi.applyVolunteer(s!.id, volForm),
    onSuccess: () => { setShowVolunteer(false); setVolError(null); },
    onError: (e) => setVolError(e instanceof ApiClientError ? e.message : "Candidature impossible."),
  });

  if (isLoading) return <p className="mx-auto max-w-[1080px] px-8 py-[60px] text-muted-foreground">Chargement…</p>;
  if (isError || !s) return <p className="mx-auto max-w-[1080px] px-8 py-[60px] text-brick-600">Refuge introuvable.</p>;

  const pets = petsQuery.data?.data ?? [];
  const events = eventsQuery.data ?? [];
  const needs = needsQuery.data ?? [];
  const hasContact = s.address || s.phone || s.email;

  return (
    <div>
      <div className="relative h-[280px] bg-muted">
        {s.coverUrl ? <img src={s.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-sable-300"><Icon name="building" size={56} /></div>}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,16,.82),transparent_62%)]" />
        <div className="absolute left-0 right-0 top-5">
          <div className="mx-auto max-w-[1080px] px-8">
            <Link to="/refuges" className="mono inline-flex h-[38px] items-center gap-1.5 rounded-[6px] bg-[rgba(251,248,241,.94)] px-[13px] text-[12px] font-semibold uppercase tracking-[0.06em] text-prune-800">
              <Icon name="chevron" size={14} className="rotate-180" /> Tous les refuges
            </Link>
          </div>
        </div>
        <div className="absolute bottom-[22px] left-0 right-0">
          <div className="mx-auto max-w-[1080px] px-8">
            <div className="flex items-end gap-4">
              {s.logoUrl
                ? <img src={s.logoUrl} alt="" className="h-[72px] w-[72px] flex-none rounded-[16px] border-2 border-sable-50 object-cover shadow-[0_8px_24px_rgba(0,0,0,.35)]" />
                : <div className="grid h-[72px] w-[72px] flex-none place-items-center rounded-[16px] border-2 border-sable-50 bg-prune-700 text-sable-50 shadow-[0_8px_24px_rgba(0,0,0,.35)]"><Icon name="building" size={32} /></div>}
              <div className="min-w-0">
                <div className="flex items-center gap-[9px]">
                  <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.01em] text-sable-50">{s.name}</h1>
                  {s.isVerified && <span className="text-sable-50" title="Refuge vérifié"><Icon name="badgeCheck" size={24} /></span>}
                </div>
                <p className="mono mt-[6px] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] uppercase tracking-[0.06em] text-sable-200">
                  {s.foundedYear && <span>Depuis {s.foundedYear}</span>}
                  {s.foundedYear && s.address && <span className="opacity-50">·</span>}
                  {s.address && <span className="inline-flex items-center gap-1"><Icon name="pin" size={13} /> {s.address}</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1080px] grid-cols-[1fr_340px] items-start gap-[30px] px-8 pb-[60px] pt-[30px] max-md:grid-cols-1">
        <div>
          {s.description && (<><h2 className="text-[24px] font-semibold text-foreground">À propos</h2><p className="mt-2.5 text-[15.5px] leading-[1.6] text-foreground">{s.description}</p></>)}
          {s.missionLong && (
            <div className="mt-5">
              <h3 className="mono text-[11px] font-semibold uppercase tracking-[0.1em] text-coral-700">Notre mission</h3>
              <p className="mt-2 whitespace-pre-line text-[14.5px] leading-[1.7] text-muted-foreground">{s.missionLong}</p>
            </div>
          )}

          {/* Engagement : famille d'accueil + bénévolat */}
          <Rule label={`Aider ${s.name}`} className="my-[18px] mt-[30px]" />
          <div className="grid gap-4 sm:grid-cols-2">
            {s.acceptsFosterApplications && (
              <EngageCard icon="home" title="Famille d'accueil" desc="Hébergez temporairement un animal, le temps qu'il trouve son foyer.">
                {requestFoster.isSuccess
                  ? <Done>Demande envoyée</Done>
                  : user
                    ? <Btn full icon="home" onClick={() => { setFosterError(null); setShowFoster(true); }}>Proposer mon aide</Btn>
                    : <Link to="/login"><Btn full icon="user" variant="outline">Se connecter</Btn></Link>}
              </EngageCard>
            )}
            <EngageCard icon="star" title="Devenir bénévole" desc="Donnez un coup de main : promenades, accueil, permanences, transport…">
              {applyVolunteer.isSuccess
                ? <Done>Candidature envoyée</Done>
                : user
                  ? <Btn full icon="star" onClick={() => { setVolError(null); setShowVolunteer(true); }}>Je veux aider</Btn>
                  : <Link to="/login"><Btn full icon="user" variant="outline">Se connecter</Btn></Link>}
            </EngageCard>
          </div>

          {/* Événements à venir */}
          {events.length > 0 && (
            <>
              <Rule label="Événements à venir" className="my-[18px] mt-[30px]" />
              <div className="flex flex-col gap-3">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-4 rounded-card border border-line bg-card p-4">
                    <div className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[10px] bg-tint-lavande text-lavande-700"><Icon name="calendar" size={22} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-[16px] font-semibold text-foreground">{ev.title}</span>
                        <span className="rounded-full bg-tint-coral px-2.5 py-0.5 text-[11px] font-semibold text-coral-700">{EVENT_TYPE[ev.type] ?? "Événement"}</span>
                      </div>
                      <p className="mono mt-1 text-[12px] uppercase tracking-[0.04em] text-muted-foreground">{cap(eventWhen(ev.startsAt))}{ev.location ? ` · ${ev.location}` : ""}</p>
                      {ev.needs && <p className="mt-1.5 text-[13px] text-muted-foreground">Besoins : {ev.needs}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {pets.length > 0 && (
            <>
              <Rule label="Animaux du refuge" className="my-[18px] mt-[30px]" />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {pets.map((p) => <PetCard key={p.id} pet={p} />)}
              </div>
            </>
          )}
        </div>

        <aside className="sticky top-24 flex flex-col gap-[18px]">
          {hasContact && (
            <Card title="Coordonnées">
              <div className="flex flex-col gap-2.5">
                {s.address && <InfoRow icon="pin">{s.address}</InfoRow>}
                {s.phone && <InfoRow icon="phone"><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-coral-700">{s.phone}</a></InfoRow>}
                {s.email && <InfoRow icon="mail"><a href={`mailto:${s.email}`} className="break-all hover:text-coral-700">{s.email}</a></InfoRow>}
              </div>
            </Card>
          )}

          {s.visitHours && (
            <Card title="Horaires d'ouverture">
              <p className="whitespace-pre-line text-[13.5px] leading-[1.6] text-foreground">{s.visitHours}</p>
            </Card>
          )}

          {needs.length > 0 && (
            <Card title="Nos besoins du moment">
              <div className="flex flex-wrap gap-1.5">
                {needs.map((n) => (
                  <span key={n.name} className={n.urgent
                    ? "inline-flex items-center gap-1 rounded-full border border-brick-300 bg-brick-50 px-2.5 py-1 text-[12px] font-semibold text-brick-600"
                    : "inline-flex items-center gap-1 rounded-full border border-line bg-background px-2.5 py-1 text-[12px] text-foreground"}>
                    {n.urgent && <Icon name="alert" size={12} />} {n.name}
                    <span className="text-muted-foreground">· {NEED_CAT[n.category] ?? n.category}</span>
                  </span>
                ))}
              </div>
              <p className="mt-2.5 text-[12px] leading-[1.45] text-muted-foreground">Un don en nature ? Contactez le refuge, tout coup de pouce compte.</p>
            </Card>
          )}

          <div className="flex flex-col gap-[9px]">
            {user && <Btn full icon="heart" variant={followed ? "soft" : "primary"} onClick={() => follow.mutate()} disabled={follow.isPending || followed}>{followed ? "Suivi" : "Suivre ce refuge"}</Btn>}
            {s.donationUrl && <a href={s.donationUrl} target="_blank" rel="noreferrer"><Btn full variant="outline" iconRight="external">{s.donationLabel ?? "Faire un don"}</Btn></a>}
            {s.website && <a href={s.website} target="_blank" rel="noreferrer"><Btn full variant="ghost" iconRight="external">Site web</Btn></a>}
          </div>
          {s.donationDescription && <p className="-mt-1 text-[12px] leading-[1.5] text-muted-foreground">{s.donationDescription}</p>}

          {s.isVerified && (
            <div className="flex items-start gap-2.5 rounded-card border border-line bg-card p-3.5">
              <span className="mt-px text-coral-600"><Icon name="badgeCheck" size={18} /></span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground">Refuge vérifié par Dorloter</div>
                <p className="text-[12px] leading-[1.45] text-muted-foreground">{s.siret ? `SIRET ${s.siret} · ` : ""}Structure contrôlée avant publication.</p>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <ReportContentButton contentType="shelter" contentId={s.id} />
          </div>
        </aside>
      </div>

      {showFoster && user && s.acceptsFosterApplications && (
        <Modal title="Devenir famille d'accueil" onClose={() => setShowFoster(false)}>
          <p className="mt-1.5 text-[13.5px] leading-[1.5] text-muted-foreground">Votre demande sera envoyée à {s.name}, qui pourra l'accepter.</p>
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); setFosterError(null); requestFoster.mutate(); }} className="mt-4 flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
              <Field label="Votre ville"><Input value={fosterForm.city} onChange={(e) => setFosterForm({ ...fosterForm, city: e.target.value })} placeholder="Lyon 6e" /></Field>
              <Field label="Animaux possibles"><Input type="number" min={1} value={fosterForm.capacity} onChange={(e) => setFosterForm({ ...fosterForm, capacity: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <FToggle on={fosterForm.acceptsCats} icon="cat" label="Chats" onClick={() => setFosterForm({ ...fosterForm, acceptsCats: !fosterForm.acceptsCats })} />
              <FToggle on={fosterForm.acceptsDogs} icon="dog" label="Chiens" onClick={() => setFosterForm({ ...fosterForm, acceptsDogs: !fosterForm.acceptsDogs })} />
            </div>
            <Field label="Message (optionnel)"><Textarea value={fosterForm.notes} onChange={(e) => setFosterForm({ ...fosterForm, notes: e.target.value })} placeholder="Votre logement, votre expérience, vos disponibilités…" /></Field>
            {fosterError && <p className="text-[13px] text-brick-600">{fosterError}</p>}
            <div className="flex justify-end gap-2.5">
              <Btn variant="ghost" type="button" onClick={() => setShowFoster(false)}>Annuler</Btn>
              <Btn type="submit" icon="send" disabled={requestFoster.isPending}>{requestFoster.isPending ? "Envoi…" : "Envoyer ma demande"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {showVolunteer && user && (
        <Modal title="Devenir bénévole" onClose={() => setShowVolunteer(false)}>
          <p className="mt-1.5 text-[13.5px] leading-[1.5] text-muted-foreground">Votre candidature sera transmise à {s.name}. Le refuge vous recontactera.</p>
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); setVolError(null); applyVolunteer.mutate(); }} className="mt-4 flex flex-col gap-3.5">
            <Field label="Vos compétences / envies" hint="Promenade, accueil, transport, communication…"><Input value={volForm.skills} onChange={(e) => setVolForm({ ...volForm, skills: e.target.value })} placeholder="Promenade de chiens, accueil du public" /></Field>
            <Field label="Vos disponibilités"><Input value={volForm.availability} onChange={(e) => setVolForm({ ...volForm, availability: e.target.value })} placeholder="Week-ends, mercredis après-midi" /></Field>
            <Field label="Message (optionnel)"><Textarea value={volForm.message} onChange={(e) => setVolForm({ ...volForm, message: e.target.value })} placeholder="Présentez-vous en quelques mots…" /></Field>
            {volError && <p className="text-[13px] text-brick-600">{volError}</p>}
            <div className="flex justify-end gap-2.5">
              <Btn variant="ghost" type="button" onClick={() => setShowVolunteer(false)}>Annuler</Btn>
              <Btn type="submit" icon="send" disabled={applyVolunteer.isPending}>{applyVolunteer.isPending ? "Envoi…" : "Envoyer ma candidature"}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-card p-[18px]">
      <div className="mono mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-px flex-none text-muted-foreground"><Icon name={icon} size={16} /></span>
      <span className="text-[13.5px] leading-[1.45] text-foreground">{children}</span>
    </div>
  );
}

function EngageCard({ icon, title, desc, children }: { icon: string; title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-card border border-coral-300 bg-tint-coral p-[18px]">
      <div className="flex items-center gap-2">
        <span className="text-coral-600"><Icon name={icon} size={18} /></span>
        <div className="font-display text-[17px] font-semibold text-foreground">{title}</div>
      </div>
      <p className="mt-1.5 flex-1 text-[13.5px] leading-[1.5] text-muted-foreground">{desc}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Done({ children }: { children: ReactNode }) {
  return <span className="mono inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-coral-700"><Icon name="check" size={14} /> {children}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(12,22,16,.45)] p-6 backdrop-blur-[3px] [animation:dlFade_.12s_ease]">
      <div onClick={(e) => e.stopPropagation()} className="w-[min(480px,100%)] rounded-[10px] border border-line bg-card p-[22px] shadow-[0_30px_80px_rgba(0,0,0,.4)] [animation:dlPop_.18s_ease]">
        <div className="flex items-center justify-between">
          <h3 className="text-[20px] font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-line bg-background text-muted-foreground"><Icon name="x" size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FToggle({ on, icon, label, onClick }: { on: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={on
      ? "inline-flex items-center gap-2 rounded-full border border-coral-500 bg-tint-coral px-3.5 py-2 text-[13.5px] font-semibold text-coral-700"
      : "inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-[13.5px] font-semibold text-muted-foreground"}>
      <Icon name={on ? "check" : icon} size={15} /> {label}
    </button>
  );
}
