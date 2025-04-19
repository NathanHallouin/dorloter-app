import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { authApi } from "@/api/auth";
import { ApiClientError } from "@/api/client";
import { PageHead, PageBody, Field, Input, Textarea } from "@/ui/forms";
import { Btn, Pill, Rule } from "@/ui/primitives";
import { Icon } from "@/ui/Icon";

const ROLE_LABEL: Record<string, string> = {
  user: "Membre", shelter_admin: "Refuge", pension_admin: "Pension", veterinarian_admin: "Vétérinaire", platform_admin: "Administration",
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
      </PageBody>
    </div>
  );
}
