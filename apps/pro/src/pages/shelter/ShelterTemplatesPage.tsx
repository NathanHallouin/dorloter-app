import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { templatesApi, type TemplateCategory } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn, field, Select } from "@/components/dash/kit";

const CAT: Record<TemplateCategory, string> = {
  acceptation: "Acceptation",
  refus: "Refus",
  infos: "Demande d'infos",
  rdv: "Rendez-vous",
  generique: "Générique",
};
const CATS = Object.keys(CAT) as TemplateCategory[];

export function ShelterTemplatesPage() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<string | null>(null);
  const templates = useQuery({ queryKey: ["response-templates"], queryFn: () => templatesApi.list() });
  const inv = () => qc.invalidateQueries({ queryKey: ["response-templates"] });

  const create = useMutation({ mutationFn: templatesApi.create, onSuccess: inv });
  const update = useMutation({
    mutationFn: (v: { id: string; name?: string; category?: TemplateCategory; subject?: string; body?: string }) =>
      templatesApi.update(v.id, v),
    onSuccess: () => { inv(); setEdit(null); },
  });
  const del = useMutation({ mutationFn: (id: string) => templatesApi.remove(id), onSuccess: inv });

  const list = templates.data ?? [];
  const input = field;

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      category: (f.get("category") as TemplateCategory) || "generique",
      name: String(f.get("name") ?? ""),
      subject: f.get("subject") ? String(f.get("subject")) : undefined,
      body: String(f.get("body") ?? ""),
    });
    e.currentTarget.reset();
  }
  function onEdit(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update.mutate({
      id,
      name: f.get("name") ? String(f.get("name")) : undefined,
      category: (f.get("category") as TemplateCategory) || undefined,
      subject: String(f.get("subject") ?? ""),
      body: f.get("body") ? String(f.get("body")) : undefined,
    });
  }

  return (
    <div>
      <DashPageHead
        title="Modèles de réponses"
        desc="Rédigez une fois vos réponses types aux candidatures. Réutilisez-les en un clic dans le flux Candidatures (bouton « Répondre »)."
      />

      <div className="mb-4 rounded-card border border-line bg-muted/40 p-3 text-[13px] text-muted-foreground">
        Variables auto-remplies à l'usage :{" "}
        <code className="rounded bg-card px-1 py-0.5 text-foreground">{"{{prenomCandidat}}"}</code>{" "}
        <code className="rounded bg-card px-1 py-0.5 text-foreground">{"{{nomAnimal}}"}</code>{" "}
        <code className="rounded bg-card px-1 py-0.5 text-foreground">{"{{nomRefuge}}"}</code>
      </div>

      <Panel title="Nouveau modèle">
        <form onSubmit={onAdd} className="grid gap-2">
          <div className="grid gap-2 md:grid-cols-3">
            <Select name="category" defaultValue="acceptation" options={CATS.map((c) => ({ value: c, label: CAT[c] }))} />
            <input name="name" required placeholder="Nom (ex. Acceptation standard)" className={cn(input, "md:col-span-2")} />
          </div>
          <input name="subject" placeholder="Objet de l'email (optionnel) · ex. Votre candidature pour {{nomAnimal}}" className={input} />
          <textarea name="body" required rows={4} placeholder="Bonjour {{prenomCandidat}}, …" className={cn(input, "resize-y")} />
          <div><MiniBtn label="Créer le modèle" icon="check" tone="green" /></div>
        </form>
      </Panel>

      {templates.isError && <p className="mt-4 text-brick-600">Accès refuge requis.</p>}
      {!templates.isLoading && list.length === 0 && (
        <p className="mt-6 text-muted-foreground">Aucun modèle pour l'instant. Créez-en un ci-dessus.</p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {list.map((t) => (
          <div key={t.id} className="rounded-card border border-line bg-card p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{CAT[t.category]}</span>
              <span className="font-semibold">{t.name}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <MiniBtn label={edit === t.id ? "Fermer" : "Éditer"} icon="sliders" onClick={() => setEdit(edit === t.id ? null : t.id)} />
                <button type="button" onClick={() => del.mutate(t.id)} className="text-xs text-brick-600 hover:underline">Suppr.</button>
              </div>
            </div>
            {t.subject && <p className="mt-1.5 text-[13px] font-medium text-foreground">{t.subject}</p>}
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.5] text-muted-foreground">{t.body}</p>

            {edit === t.id && (
              <form onSubmit={(e) => onEdit(e, t.id)} className="mt-3 grid gap-2 border-t border-line pt-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <Select name="category" defaultValue={t.category} options={CATS.map((c) => ({ value: c, label: CAT[c] }))} />
                  <input name="name" defaultValue={t.name} className={cn(input, "md:col-span-2")} />
                </div>
                <input name="subject" defaultValue={t.subject ?? ""} placeholder="Objet de l'email (optionnel)" className={input} />
                <textarea name="body" defaultValue={t.body} rows={4} className={cn(input, "resize-y")} />
                <div><MiniBtn label="Enregistrer" icon="check" tone="green" /></div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
