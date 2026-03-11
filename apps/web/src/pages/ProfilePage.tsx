import { useState, lazy, Suspense } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@dorloter/client";
import { authApi } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { PageHead, PageBody, Field, Input, Textarea } from "@dorloter/ui";
import { Btn, Pill, Rule } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";

import { PrivacyControls } from "@/components/PrivacyControls";

// Carte de sélection : MapLibre est volumineux, chargé à la demande.
const LocationPickerMap = lazy(() =>
  import("@/components/LocationPickerMap").then((m) => ({ default: m.LocationPickerMap })),
);

const ROLE_LABEL: Record<string, string> = {
  user: "Membre", shelter_admin: "Refuge", pension_admin: "Pension", platform_admin: "Administration",
};

const LINKS: { to: string; icon: string; label: string }[] = [
  { to: "/favoris", icon: "heart", label: "Mes favoris" },
  { to: "/mes-candidatures", icon: "inbox", label: "Mes candidatures" },
  { to: "/mes-reservations", icon: "calendar", label: "Mes réservations" },
  { to: "/famille-accueil", icon: "home", label: "Famille d'accueil" },
  { to: "/messages", icon: "message", label: "Messagerie" },
];

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", city: user?.city ?? "", bio: user?.bio ?? "" });
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(
    user?.latitude != null && user?.longitude != null ? { lat: user.latitude, lng: user.longitude } : null,
  );
  const [radius, setRadius] = useState(user?.notificationRadiusKm ?? 25);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof authApi.updateProfile>[0]) => authApi.updateProfile(patch),
    onSuccess: (u) => { setUser(u); setSaved(true); setTimeout(() => setSaved(false), 2500); },
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Échec de l'enregistrement."),
  });

  if (!user) return null;
  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : null;

  const onSubmit = (e: FormEvent) => { e.preventDefault(); setError(null); save.mutate(form); };
  const toggleVisibility = () => save.mutate({ isPublic: !user.isPublic });
  const toggleDigest = () => save.mutate({ digestOptin: !user.digestOptin });
  const saveZone = () => { setError(null); save.mutate({ latitude: geo?.lat, longitude: geo?.lng, notificationRadiusKm: radius }); };

  return (
    <div>
      <PageHead crumb="Profil" title="Mon profil" sub="Vos informations et la visibilité de votre profil." />
      <PageBody width={860}>
        <div className="grid grid-cols-[1fr_300px] items-start gap-7 max-md:grid-cols-1">
          {/* colonne édition */}
          <div>
            <div className="mb-6 flex items-center gap-4">
              <span className="grid h-[72px] w-[72px] flex-none place-items-center rounded-[10px] bg-tint-coral font-display text-[30px] font-semibold text-coral-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[24px] font-semibold text-foreground">{user.name}</h2>
                  <Pill tone="coral">{ROLE_LABEL[user.role] ?? user.role}</Pill>
                </div>
                <p className="mono mt-1 text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                  {user.email}{since ? ` · membre depuis ${since}` : ""}
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-[8px] border border-line bg-card p-[22px]">
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <Field label="Nom"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="06 12 34 56 78" /></Field>
                <Field label="Ville" full><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lyon 6e" /></Field>
              </div>
              <Field label="Bio"><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Quelques mots sur vous et vos compagnons…" /></Field>
              {error && <p className="text-[13px] text-brick-600">{error}</p>}
              <div className="flex items-center gap-3">
                <Btn type="submit" icon="check" disabled={save.isPending}>{save.isPending ? "Enregistrement…" : "Enregistrer"}</Btn>
                {saved && <span className="mono text-[12px] uppercase tracking-[0.06em] text-coral-600">Enregistré ✓</span>}
              </div>
            </form>
          </div>

          {/* colonne latérale */}
          <aside className="flex flex-col gap-[18px]">
            <div className="rounded-[8px] border border-line bg-card p-[18px]">
              <div className="mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Visibilité du profil</div>
              <div className="mt-2.5 flex items-center gap-2">
                <Icon name={user.isPublic ? "eye" : "lock"} size={18} className={user.isPublic ? "text-coral-600" : "text-muted-foreground"} />
                <span className="text-[14px] font-semibold text-foreground">{user.isPublic ? "Public" : "Privé"}</span>
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.5] text-muted-foreground">
                {user.isPublic ? "Votre nom, bio et ville sont visibles par la communauté." : "Votre profil n'est visible que de vous."}
              </p>
              <div className="mt-3">
                <Btn full variant={user.isPublic ? "outline" : "primary"} icon={user.isPublic ? "lock" : "eye"} onClick={toggleVisibility} disabled={save.isPending}>
                  {user.isPublic ? "Rendre privé" : "Rendre public"}
                </Btn>
              </div>
            </div>

            <div className="rounded-[8px] border border-line bg-card p-2">
              <Rule label="Raccourcis" className="mx-2 mb-1.5 mt-2.5" />
              {LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="flex items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-[14px] font-semibold text-foreground hover:bg-muted">
                  <span className="text-coral-600"><Icon name={l.icon} size={17} /></span> {l.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>

        {/* Alertes de proximité : localisation + rayon + digest (feature 5.2) */}
        <section className="mt-7 rounded-[8px] border border-line bg-card p-[22px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">Alertes de proximité</h3>
              <p className="mt-1 max-w-[520px] text-[13.5px] leading-[1.5] text-muted-foreground">
                Indiquez votre secteur : nous vous suggérons les nouveaux animaux à adopter publiés près de chez vous,
                choisis selon vos coups de cœur. Cliquez sur la carte pour poser votre point.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-line px-3 py-2 text-[13px] font-semibold text-foreground">
              <input type="checkbox" checked={user.digestOptin} onChange={toggleDigest} disabled={save.isPending} />
              Recevoir le digest
            </label>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_260px] gap-5 max-md:grid-cols-1">
            <div className="h-[280px] overflow-hidden rounded-[8px] border border-line">
              <Suspense fallback={<div className="grid h-full place-items-center bg-muted text-[13px] text-muted-foreground">Chargement de la carte…</div>}>
                <LocationPickerMap value={geo} onChange={(lat, lng) => setGeo({ lat, lng })} />
              </Suspense>
            </div>
            <div className="flex flex-col gap-3">
              <Field label={`Rayon d'alerte : ${radius} km`}>
                <input
                  type="range" min={5} max={100} step={5} value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-coral-600"
                />
              </Field>
              <div className="rounded-[6px] bg-muted px-3 py-2.5 text-[12.5px] text-muted-foreground">
                {geo ? (
                  <>Point posé : <span className="tabular font-semibold text-foreground">{geo.lat.toFixed(3)}, {geo.lng.toFixed(3)}</span></>
                ) : (
                  "Aucun point encore. Cliquez sur la carte."
                )}
              </div>
              <Btn icon="marker" onClick={saveZone} disabled={save.isPending || !geo}>
                {save.isPending ? "Enregistrement…" : "Enregistrer ma zone"}
              </Btn>
              {user.latitude != null && (
                <Link to="/adopter" className="text-center text-[12.5px] text-coral-700 hover:underline">
                  Voir les nouveautés près de moi →
                </Link>
              )}
            </div>
          </div>
        </section>

        <PrivacyControls />
      </PageBody>
    </div>
  );
}
