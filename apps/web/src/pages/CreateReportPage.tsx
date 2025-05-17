import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { reportsApi } from "@dorloter/client";
import type { CreateReportInput } from "@dorloter/client";
import { LocationPickerMap } from "@/components/LocationPickerMap";
import { ApiClientError } from "@dorloter/client";
import { Icon } from "@dorloter/ui";
import { Btn, Eyebrow } from "@dorloter/ui";
import { Field, Input, Textarea, Select, Segmented } from "@dorloter/ui";

export function CreateReportPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: "perdu" as "perdu" | "trouve",
    species: "chat" as "chat" | "chien",
    petName: "", color: "", breed: "",
    sex: "inconnu" as "male" | "femelle" | "inconnu",
    dateEvent: new Date().toISOString().slice(0, 10),
    description: "", address: "", contactPhone: "",
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (input: CreateReportInput) => reportsApi.create(input),
    onSuccess: (report) => navigate(`/perdus-trouves/${report.id}`),
    onError: (err) => setError(err instanceof ApiClientError ? err.message : "Envoi impossible."),
  });

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!location) { setError("Cliquez sur la carte pour indiquer le lieu."); return; }
    create.mutate({
      type: form.type, species: form.species, description: form.description,
      petName: form.petName || undefined, color: form.color || undefined, breed: form.breed || undefined,
      sex: form.sex, latitude: location.lat, longitude: location.lng,
      address: form.address || undefined, dateEvent: form.dateEvent, contactPhone: form.contactPhone || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-[760px] px-8 pb-[60px] pt-9">
      <Link to="/perdus-trouves" className="mono inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        <Icon name="chevron" size={13} className="rotate-180" /> Perdus &amp; trouvés
      </Link>
      <div className="mt-3.5"><Eyebrow>Signalement</Eyebrow></div>
      <h1 className="mb-6 mt-2 text-[36px] font-semibold tracking-[-0.01em] text-foreground">Signaler un animal</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-[22px] rounded-[6px] border border-line bg-card p-7">
        <Field label="Que signalez-vous ?">
          <Segmented full value={form.type} onChange={(v) => update({ type: v as "perdu" | "trouve" })}
            options={[{ value: "perdu", label: "J'ai perdu un animal", icon: "radio" }, { value: "trouve", label: "J'ai trouvé un animal", icon: "badgeCheck" }]} />
        </Field>
        <Field label="Espèce">
          <Segmented full value={form.species} onChange={(v) => update({ species: v as "chat" | "chien" })}
            options={[{ value: "chat", label: "Chat", icon: "cat" }, { value: "chien", label: "Chien", icon: "dog" }]} />
        </Field>

        <div className="grid grid-cols-2 gap-[18px] max-sm:grid-cols-1">
          <Field label="Nom (si connu)"><Input value={form.petName} onChange={(e) => update({ petName: e.target.value })} placeholder="Tigrou…" /></Field>
          <Field label="Sexe"><Select value={form.sex} onChange={(e) => update({ sex: e.target.value as typeof form.sex })} options={[{ value: "inconnu", label: "Inconnu" }, { value: "male", label: "Mâle" }, { value: "femelle", label: "Femelle" }]} /></Field>
          <Field label="Couleur / robe"><Input value={form.color} onChange={(e) => update({ color: e.target.value })} placeholder="Tigré, noir…" /></Field>
          <Field label="Race"><Input value={form.breed} onChange={(e) => update({ breed: e.target.value })} placeholder="Européen…" /></Field>
          <Field label="Date"><Input type="date" value={form.dateEvent} onChange={(e) => update({ dateEvent: e.target.value })} /></Field>
          <Field label="Téléphone de contact"><Input value={form.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })} placeholder="06 12 34 56 78" /></Field>
          <Field label="Adresse (texte)" full><Input value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Parc, rue, quartier…" /></Field>
          <Field label="Description" full><Textarea required value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="Décrivez l'animal et les circonstances…" /></Field>
        </div>

        <Field label={`Lieu sur la carte ${location ? "✓" : "(cliquez pour placer le marqueur)"}`} full>
          <LocationPickerMap value={location} onChange={(lat, lng) => setLocation({ lat, lng })} />
        </Field>

        {error && <p className="text-[13px] text-brick-600">{error}</p>}

        <div className="flex items-center justify-between border-t border-line pt-5">
          <Link to="/perdus-trouves" className="mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Annuler</Link>
          <Btn type="submit" icon="check" disabled={create.isPending}>{create.isPending ? "Publication…" : "Publier le signalement"}</Btn>
        </div>
      </form>
    </div>
  );
}
