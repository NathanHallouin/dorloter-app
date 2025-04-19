import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sheltersApi } from "@/api/shelters";
import { petsApi } from "@/api/pets";
import { myFosterApi } from "@/api/foster";
import { ApiClientError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { PetCard } from "@/components/PetCard";
import { Icon } from "@/ui/Icon";
import { Btn, Rule } from "@/ui/primitives";
import { Field, Input, Textarea } from "@/ui/forms";
import { ReportContentButton } from "@/components/ReportContentButton";

export function ShelterDetailPage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const [followed, setFollowed] = useState(false);
  const [showFoster, setShowFoster] = useState(false);
  const [fosterForm, setFosterForm] = useState({ city: "", capacity: 1, acceptsCats: true, acceptsDogs: true, notes: "" });
  const [fosterError, setFosterError] = useState<string | null>(null);

  const { data: s, isLoading, isError } = useQuery({ queryKey: ["shelter", slug], queryFn: () => sheltersApi.get(slug), enabled: slug !== "" });
  const petsQuery = useQuery({ queryKey: ["shelter-pets-public", s?.id], queryFn: () => petsApi.list({ shelterId: s!.id, limit: 8 }), enabled: !!s });
  const follow = useMutation({ mutationFn: () => sheltersApi.follow(s!.id), onSuccess: () => setFollowed(true) });
  const requestFoster = useMutation({
    mutationFn: () => myFosterApi.request(s!.id, fosterForm),
    onSuccess: () => { setShowFoster(false); setFosterError(null); },
    onError: (e) => setFosterError(e instanceof ApiClientError ? e.message : "Demande impossible."),
  });

  if (isLoading) return <p className="mx-auto max-w-[1080px] px-8 py-[60px] text-muted-foreground">Chargement…</p>;
  if (isError || !s) return <p className="mx-auto max-w-[1080px] px-8 py-[60px] text-brick-600">Refuge introuvable.</p>;

  const pets = petsQuery.data?.data ?? [];
  const contactRows: [string, string | null][] = [["pin", s.address], ["clock", s.visitHours], ["phone", s.phone], ["mail", s.email]];

  return (
    <div>
      <div className="relative h-[280px] bg-muted">
        {s.coverUrl ? <img src={s.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-sable-300"><Icon name="building" size={56} /></div>}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,16,.78),transparent_60%)]" />
        <div className="absolute left-0 right-0 top-5">
          <div className="mx-auto max-w-[1080px] px-8">
            <Link to="/refuges" className="mono inline-flex h-[38px] items-center gap-1.5 rounded-[6px] bg-[rgba(251,248,241,.94)] px-[13px] text-[12px] font-semibold uppercase tracking-[0.06em] text-prune-800">
              <Icon name="chevron" size={14} className="rotate-180" /> Tous les refuges
            </Link>
          </div>
        </div>
        <div className="absolute bottom-[22px] left-0 right-0">
          <div className="mx-auto max-w-[1080px] px-8">
            <div className="flex items-center gap-[9px]">
              <h1 className="text-[40px] font-semibold tracking-[-0.01em] text-sable-50">{s.name}</h1>
              {s.isVerified && <span className="text-sable-50"><Icon name="badgeCheck" size={24} /></span>}
            </div>
            {s.foundedYear && <p className="mono mt-[5px] text-[12px] uppercase tracking-[0.06em] text-sable-200">Depuis {s.foundedYear}</p>}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1080px] grid-cols-[1fr_340px] items-start gap-[30px] px-8 pb-[60px] pt-[30px] max-md:grid-cols-1">
        <div>
          {s.description && (<><h2 className="text-[24px] font-semibold text-foreground">À propos</h2><p className="mt-2.5 text-[15.5px] leading-[1.6] text-foreground">{s.description}</p></>)}
          {s.missionLong && <p className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">{s.missionLong}</p>}

          {s.acceptsFosterApplications && (
            <div className="mt-[30px] flex flex-wrap items-center justify-between gap-3 rounded-card border border-coral-300 bg-tint-coral p-5">
              <div className="min-w-0">
                <div className="font-display text-[18px] font-semibold text-foreground">Devenir famille d'accueil</div>
                <p className="text-[14px] text-muted-foreground">Hébergez temporairement un animal de ce refuge, le temps qu'il trouve son foyer.</p>
              </div>
              {requestFoster.isSuccess ? (
                <span className="mono text-[12px] uppercase tracking-[0.06em] text-coral-700">Demande envoyée ✓</span>
              ) : user ? (
                <Btn icon="home" onClick={() => { setFosterError(null); setShowFoster(true); }}>Proposer mon aide</Btn>
              ) : (
                <Link to="/login"><Btn icon="user" variant="outline">Se connecter pour proposer</Btn></Link>
              )}
            </div>
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

        <aside className="sticky top-24 rounded-card border border-line bg-card p-[18px]">
          <div className="flex flex-col gap-[9px]">
            {contactRows.filter(([, t]) => t).map(([ic, tx]) => (
              <div key={ic} className="flex items-start gap-2.5">
                <span className="mt-px text-muted-foreground"><Icon name={ic} size={16} /></span>
                <span className="text-[13.5px] text-foreground">{tx}</span>
              </div>
            ))}
          </div>
          <div className="mt-[18px] flex flex-col gap-[9px]">
            {user && <Btn full icon="heart" variant={followed ? "soft" : "primary"} onClick={() => follow.mutate()} disabled={follow.isPending || followed}>{followed ? "Suivi" : "Suivre ce refuge"}</Btn>}
            {s.donationUrl && <a href={s.donationUrl} target="_blank" rel="noreferrer"><Btn full variant="outline" iconRight="external">{s.donationLabel ?? "Faire un don"}</Btn></a>}
            {s.website && <a href={s.website} target="_blank" rel="noreferrer"><Btn full variant="ghost" iconRight="external">Site web</Btn></a>}
          </div>
          {s.donationDescription && <p className="mt-3 text-[12px] leading-[1.5] text-muted-foreground">{s.donationDescription}</p>}
          <div className="mt-3 flex justify-center border-t border-line pt-3">
            <ReportContentButton contentType="shelter" contentId={s.id} />
          </div>
        </aside>
      </div>

      {showFoster && user && s.acceptsFosterApplications && (
        <div onClick={() => setShowFoster(false)} className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(12,22,16,.45)] p-6 backdrop-blur-[3px] [animation:dlFade_.12s_ease]">
          <div onClick={(e) => e.stopPropagation()} className="w-[min(480px,100%)] rounded-[10px] border border-line bg-card p-[22px] shadow-[0_30px_80px_rgba(0,0,0,.4)] [animation:dlPop_.18s_ease]">
            <div className="flex items-center justify-between">
              <h3 className="text-[20px] font-semibold text-foreground">Devenir famille d'accueil</h3>
              <button onClick={() => setShowFoster(false)} aria-label="Fermer" className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-line bg-background text-muted-foreground"><Icon name="x" size={16} /></button>
            </div>
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
          </div>
        </div>
      )}
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
