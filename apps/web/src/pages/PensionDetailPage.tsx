import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { pensionsApi } from "@/api/pensions";
import { useAuth } from "@/auth/AuthContext";
import { ApiClientError } from "@/api/client";
import { Icon } from "@/ui/Icon";
import { Btn, Pill, Rule } from "@/ui/primitives";
import { Field, Input, Select } from "@/ui/forms";

const SERVICE_LABELS: Record<string, string> = {
  medication: "Médication", grooming: "Toilettage", outdoorAccess: "Accès extérieur",
  nightStaff: "Surveillance nuit", transport: "Transport", senior: "Accueil senior",
};

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) || 1);
}

export function PensionDetailPage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: p, isLoading, isError } = useQuery({ queryKey: ["pension", slug], queryFn: () => pensionsApi.get(slug), enabled: slug !== "" });

  const [species, setSpecies] = useState<string>("");
  const [petName, setPetName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const book = useMutation({
    mutationFn: () => pensionsApi.book(p!.id, { species: species || (p!.acceptsCats ? "chat" : "chien"), petName: petName || undefined, startDate: from, endDate: to }),
    onSuccess: () => navigate("/mes-reservations"),
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Réservation impossible."),
  });

  const effectiveSpecies = species || (p?.acceptsCats ? "chat" : "chien");
  const perDay = effectiveSpecies === "chat" ? p?.pricePerDayCat : p?.pricePerDayDog;
  const nights = useMemo(() => (from && to ? daysBetween(from, to) : 0), [from, to]);
  const total = perDay != null && nights ? perDay * nights : null;

  if (isLoading) return <p className="mx-auto max-w-[1180px] px-8 py-[60px] text-muted-foreground">Chargement…</p>;
  if (isError || !p) return <p className="mx-auto max-w-[1180px] px-8 py-[60px] text-brick-600">Pension introuvable.</p>;

  const services = Object.entries(p.services ?? {}).filter(([, on]) => on).map(([k]) => SERVICE_LABELS[k] ?? k);
  const speciesOptions = [
    ...(p.acceptsCats ? [{ value: "chat", label: "Chat" }] : []),
    ...(p.acceptsDogs ? [{ value: "chien", label: "Chien" }] : []),
  ];

  return (
    <div>
      <div className="relative h-[300px] bg-muted">
        {p.coverUrl ? <img src={p.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-sable-300"><Icon name="home" size={56} /></div>}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,16,.85),transparent_60%)]" />
        <div className="absolute inset-0">
          <div className="mx-auto flex h-full max-w-[1180px] flex-col items-start justify-end px-8 pb-6">
            <Link to="/pensions" className="mono mb-3.5 inline-flex items-center gap-[7px] rounded-[4px] bg-white/[0.12] px-3 py-[7px] text-[11px] font-semibold uppercase tracking-[0.1em] text-sable-50">
              <Icon name="chevron" size={13} className="rotate-180" /> Pensions
            </Link>
            <Pill tone="white" icon="shieldCheck">Pension agréée</Pill>
            <h1 className="mt-2.5 text-[42px] font-semibold leading-none tracking-[-0.02em] text-sable-50">{p.name}</h1>
            <p className="mono mt-2 flex items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] text-sable-200">
              <Icon name="pin" size={14} /> {p.address ?? "France"}{p.rating ? ` · ★ ${p.rating.average} (${p.rating.count} avis)` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1180px] grid-cols-[1fr_360px] items-start gap-10 px-8 pb-[60px] pt-9 max-md:grid-cols-1">
        <div>
          <div className="flex flex-wrap gap-2">
            {p.acceptsCats && <Pill tone="coral" icon="cat">Chats</Pill>}
            {p.acceptsDogs && <Pill tone="lavande" icon="dog">Chiens</Pill>}
            {services.map((s) => <Pill key={s} tone="sable">{s}</Pill>)}
          </div>
          {p.description && <p className="lead-drop mt-[22px] max-w-[620px] text-[17px] leading-[1.65] text-foreground">{p.description}</p>}

          <Rule label="Informations" className="my-[18px] mt-[30px]" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
            {([["phone", p.phone], ["mail", p.email], ["clock", p.openingHours], ["badgeCheck", `SIRET ${p.siret}`]] as [string, string | null][]).filter(([, t]) => t).map(([ic, tx]) => (
              <div key={ic} className="flex items-center gap-2.5 rounded-[8px] border border-line bg-card px-3.5 py-3">
                <span className="text-coral-600"><Icon name={ic} size={17} /></span>
                <span className="text-[13.5px] text-foreground">{tx}</span>
              </div>
            ))}
          </div>
        </div>

        {/* réservation */}
        <aside className="sticky top-[90px] rounded-[6px] border border-foreground bg-card p-[22px]">
          {perDay != null && (
            <div className="flex items-baseline gap-1.5">
              <span className="tabular font-display text-[30px] font-semibold text-foreground">{perDay} €</span>
              <span className="mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">/ jour ({effectiveSpecies})</span>
            </div>
          )}
          {!user ? (
            <div className="mt-4">
              <p className="mb-3 text-[14px] text-muted-foreground">Connectez-vous pour demander une réservation.</p>
              <Link to="/login"><Btn full icon="user">Se connecter</Btn></Link>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setError(null); if (!from || !to) { setError("Choisissez les dates."); return; } book.mutate(); }} className="mt-4 flex flex-col gap-3">
              {speciesOptions.length > 1 && (
                <Field label="Pensionnaire"><Select value={effectiveSpecies} onChange={(e) => setSpecies(e.target.value)} options={speciesOptions} /></Field>
              )}
              <Field label="Nom de l'animal"><Input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="Nala…" /></Field>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Arrivée"><Input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
                <Field label="Départ"><Input type="date" required value={to} onChange={(e) => setTo(e.target.value)} /></Field>
              </div>
              {total != null && (
                <div className="flex items-baseline justify-between border-t border-line pt-3">
                  <span className="mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{perDay} € × {nights} nuit{nights > 1 ? "s" : ""}</span>
                  <span className="tabular font-display text-[22px] font-semibold text-coral-700">{total} €</span>
                </div>
              )}
              {error && <p className="text-[13px] text-brick-600">{error}</p>}
              <Btn type="submit" full size="lg" icon="calendar" disabled={book.isPending}>{book.isPending ? "Envoi…" : "Demander une réservation"}</Btn>
              <p className="mono text-center text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">Sans engagement · confirmée par la pension</p>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
