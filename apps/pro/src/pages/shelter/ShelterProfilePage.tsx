import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi, useAuth, ApiClientError, type ShelterProfileInput } from "@dorloter/client";
import { Btn, Field, Input, Textarea, Pill } from "@dorloter/ui";
import { DashPageHead, Panel } from "@/components/dash/kit";

type Form = Record<
  | "name" | "description" | "missionLong" | "foundedYear" | "siret" | "address" | "phone"
  | "email" | "website" | "visitHours" | "donationUrl" | "donationLabel" | "donationDescription"
  | "logoUrl" | "coverUrl",
  string
>;

const EMPTY: Form = {
  name: "", description: "", missionLong: "", foundedYear: "", siret: "", address: "", phone: "",
  email: "", website: "", visitHours: "", donationUrl: "", donationLabel: "", donationDescription: "",
  logoUrl: "", coverUrl: "",
};

const clean = (v: string) => (v.trim() === "" ? null : v.trim());

/** Profil public du refuge : édition de la fiche (coordonnées, horaires, dons…) + paramètres. */
export function ShelterProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profile = useQuery({ queryKey: ["shelter-profile"], queryFn: () => shelterApi.profile() });
  const members = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });
  const settings = useQuery({ queryKey: ["shelter-settings"], queryFn: () => shelterApi.settings() });

  const myRole = members.data?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "gestionnaire";
  const fosteringOpen = settings.data?.acceptsFosterApplications ?? false;

  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise le formulaire dès que la fiche est chargée (ou rechargée).
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      name: p.name ?? "", description: p.description ?? "", missionLong: p.missionLong ?? "",
      foundedYear: p.foundedYear != null ? String(p.foundedYear) : "", siret: p.siret ?? "",
      address: p.address ?? "", phone: p.phone ?? "", email: p.email ?? "", website: p.website ?? "",
      visitHours: p.visitHours ?? "", donationUrl: p.donationUrl ?? "", donationLabel: p.donationLabel ?? "",
      donationDescription: p.donationDescription ?? "", logoUrl: p.logoUrl ?? "", coverUrl: p.coverUrl ?? "",
    });
  }, [profile.data]);

  const set = (patch: Partial<Form>) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); setError(null); };

  const save = useMutation({
    mutationFn: () => {
      const input: ShelterProfileInput = {
        name: form.name.trim(),
        description: clean(form.description), missionLong: clean(form.missionLong),
        foundedYear: form.foundedYear.trim() === "" ? null : Number(form.foundedYear),
        siret: clean(form.siret), address: clean(form.address), phone: clean(form.phone),
        email: clean(form.email), website: clean(form.website), visitHours: clean(form.visitHours),
        donationUrl: clean(form.donationUrl), donationLabel: clean(form.donationLabel),
        donationDescription: clean(form.donationDescription), logoUrl: clean(form.logoUrl), coverUrl: clean(form.coverUrl),
      };
      return shelterApi.updateProfile(input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shelter-profile"] }); setSaved(true); },
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Enregistrement impossible."),
  });

  const toggleFostering = useMutation({
    mutationFn: (open: boolean) => shelterApi.setFosteringOpen(open),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shelter-settings"] }),
  });

  const ro = !canManage;
  const onSubmit = (e: FormEvent) => { e.preventDefault(); if (!ro && form.name.trim()) save.mutate(); };

  if (profile.isLoading) return <p className="text-muted-foreground">Chargement de la fiche…</p>;
  if (profile.isError) {
    const err = profile.error;
    const msg = err instanceof ApiClientError
      ? `${err.message} (HTTP ${err.status})`
      : "Impossible de charger la fiche du refuge.";
    return (
      <div>
        <DashPageHead title="Profil du refuge" />
        <p className="text-brick-600">{msg}</p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Si l'API vient d'être mise à jour, redémarrez-la (un nouveau endpoint n'est pas pris en compte par le rechargement à chaud).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <DashPageHead
        title="Profil du refuge"
        desc="Les informations affichées sur votre fiche publique : coordonnées, horaires, mission, dons."
        action={canManage ? (
          <Btn type="submit" icon="check" disabled={save.isPending || !form.name.trim()}>
            {save.isPending ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
          </Btn>
        ) : undefined}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {profile.data?.isVerified
          ? <Pill tone="green" icon="shieldCheck">Refuge vérifié</Pill>
          : <Pill tone="lavande">Vérification en attente</Pill>}
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          dorloter.fr/refuges/{profile.data?.slug}
        </span>
        {!canManage && <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">· lecture seule</span>}
      </div>

      {error && <p className="mb-4 text-[13px] text-brick-600">{error}</p>}

      <div className="flex flex-col gap-5">
        <Panel title="Identité" hint="Nom, présentation et mission de votre structure">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de la structure"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} disabled={ro} placeholder="Refuge des Quatre Pattes" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Année de création"><Input type="number" min="1800" max="2100" value={form.foundedYear} onChange={(e) => set({ foundedYear: e.target.value })} disabled={ro} placeholder="1998" /></Field>
              <Field label="SIRET"><Input value={form.siret} onChange={(e) => set({ siret: e.target.value })} disabled={ro} placeholder="14 chiffres" /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Présentation courte" hint="Une phrase affichée en tête de fiche et dans l'annuaire">
                <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} disabled={ro} rows={2} placeholder="Association loi 1901 dédiée au sauvetage des chats et chiens du bassin…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notre mission" hint="Texte long : histoire, valeurs, actions">
                <Textarea value={form.missionLong} onChange={(e) => set({ missionLong: e.target.value })} disabled={ro} rows={5} placeholder="Depuis 1998, notre refuge…" />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="Coordonnées & accès" hint="Comment vous joindre et vous rendre visite">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone"><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} disabled={ro} placeholder="01 23 45 67 89" /></Field>
            <Field label="Email de contact"><Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} disabled={ro} placeholder="contact@refuge.fr" /></Field>
            <Field label="Site web"><Input value={form.website} onChange={(e) => set({ website: e.target.value })} disabled={ro} placeholder="https://…" /></Field>
            <Field label="Adresse"><Input value={form.address} onChange={(e) => set({ address: e.target.value })} disabled={ro} placeholder="12 rue des Tilleuls, 33000 Bordeaux" /></Field>
            <div className="sm:col-span-2">
              <Field label="Horaires d'ouverture / visite" hint="Une ligne par jour, ou une plage globale. Affiché tel quel sur la fiche.">
                <Textarea value={form.visitHours} onChange={(e) => set({ visitHours: e.target.value })} disabled={ro} rows={4}
                  placeholder={"Lundi au vendredi : 9h–12h et 14h–18h\nSamedi : 10h–17h\nDimanche et jours fériés : fermé"} />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="Dons" hint="Lien de collecte affiché sur votre fiche">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lien de don"><Input value={form.donationUrl} onChange={(e) => set({ donationUrl: e.target.value })} disabled={ro} placeholder="https://www.helloasso.com/…" /></Field>
            <Field label="Libellé du bouton"><Input value={form.donationLabel} onChange={(e) => set({ donationLabel: e.target.value })} disabled={ro} placeholder="Faire un don" /></Field>
            <div className="sm:col-span-2">
              <Field label="Texte d'appel aux dons">
                <Textarea value={form.donationDescription} onChange={(e) => set({ donationDescription: e.target.value })} disabled={ro} rows={2} placeholder="Chaque don finance les soins vétérinaires de nos pensionnaires." />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="Visuels" hint="Logo et image de couverture (URL pour l'instant)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Logo (URL)"><Input value={form.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} disabled={ro} placeholder="https://…" /></Field>
            <Field label="Image de couverture (URL)"><Input value={form.coverUrl} onChange={(e) => set({ coverUrl: e.target.value })} disabled={ro} placeholder="https://…" /></Field>
          </div>
        </Panel>
      </div>

      <h2 className="font-mono mb-3 mt-9 text-[12px] font-semibold uppercase tracking-[0.1em] text-coral-700">Paramètres</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-[18px]">
        <div className="min-w-0">
          <div className="font-display text-[16px] font-semibold text-foreground">Demandes spontanées de familles d'accueil</div>
          <p className="text-[13px] text-muted-foreground">Autoriser les bénévoles à demander à vous rejoindre depuis votre fiche publique.</p>
        </div>
        {canManage ? (
          <Btn size="sm" type="button" variant={fosteringOpen ? "primary" : "outline"} icon={fosteringOpen ? "check" : "x"}
            onClick={() => toggleFostering.mutate(!fosteringOpen)} disabled={toggleFostering.isPending || settings.isLoading}>
            {fosteringOpen ? "Activées" : "Désactivées"}
          </Btn>
        ) : (
          <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{fosteringOpen ? "Activées" : "Désactivées"}</span>
        )}
      </div>
    </form>
  );
}
