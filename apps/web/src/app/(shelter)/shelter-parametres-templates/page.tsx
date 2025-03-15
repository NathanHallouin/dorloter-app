import type { Metadata } from "next";
import { Plus, FileText } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import {
  getTemplatesForShelter,
  TEMPLATE_VARIABLES,
  type ResponseTemplate,
  type ResponseTemplateKind,
} from "@shelters/public";
import { TemplateEditor } from "./template-editor";
import { TemplateRow } from "./template-row";

export const metadata: Metadata = {
  title: "Templates de réponses · Refuge",
};

const KIND_META: Record<
  ResponseTemplateKind,
  { label: string; description: string }
> = {
  acceptation: {
    label: "Acceptation",
    description:
      "Messages chaleureux pour annoncer une réponse positive à un candidat.",
  },
  refus: {
    label: "Refus",
    description:
      "Messages polis pour signifier qu'on ne donne pas suite à la candidature.",
  },
  demande_infos: {
    label: "Demande d'infos",
    description: "Pour récupérer des compléments avant de décider.",
  },
  rdv: {
    label: "Rendez-vous",
    description: "Pour proposer une visite ou un rencontre au refuge.",
  },
  generique: {
    label: "Générique",
    description: "Tout autre type de réponse, à puiser au cas par cas.",
  },
};

const KIND_ORDER: ResponseTemplateKind[] = [
  "acceptation",
  "refus",
  "demande_infos",
  "rdv",
  "generique",
];

export default async function ShelterTemplatesPage() {
  const session = await requireShelter();
  const templates = await getTemplatesForShelter(session.user.shelterId);
  const byKind = groupByKind(templates);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-lavande-700">
          Paramètres
        </p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">
          Templates de réponses
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pré-rédigez des réponses types pour les candidatures et gagnez
          du temps. Au moment d&apos;accepter ou refuser une candidature, vous
          pourrez piocher dans cette bibliothèque avec auto-remplissage des
          noms du candidat et de l&apos;animal.
        </p>
      </header>

      {/* Aide variables */}
      <section className="rounded-2xl border border-coral-200 bg-coral-50/50 p-4 text-sm">
        <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-800">
          <FileText className="h-4 w-4" />
          Variables disponibles
        </h2>
        <p className="mb-3 text-xs text-foreground/80">
          Insérez ces marqueurs dans le corps de vos templates : ils seront
          remplacés automatiquement quand vous appliquerez la réponse à une
          candidature.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(TEMPLATE_VARIABLES).map(([key, label]) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-3 rounded-md border border-coral-200/60 bg-white px-2.5 py-1.5"
            >
              <code className="text-xs font-bold text-coral-700">
                {"{{"}
                {key}
                {"}}"}
              </code>
              <span className="text-[11px] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Création d'un nouveau template */}
      <details className="rounded-2xl border border-border bg-card p-4 [&[open]>summary>svg]:rotate-90">
        <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
            <Plus className="h-4 w-4 text-coral-500 transition-transform" />
            Nouveau template
          </span>
        </summary>
        <div className="mt-4">
          <TemplateEditor mode="create" />
        </div>
      </details>

      {/* Liste groupée par kind */}
      <div className="space-y-6">
        {KIND_ORDER.map((kind) => {
          const list = byKind[kind] ?? [];
          const meta = KIND_META[kind];
          return (
            <section key={kind}>
              <header className="mb-2 flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                    <span className="rounded-full bg-sable-200/70 px-2 py-0.5 text-[10px] font-bold tabular-nums text-sable-800">
                      {list.length}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
              </header>

              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-sable-50/40 p-4 text-center text-xs text-muted-foreground">
                  Aucun template pour cette catégorie.
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((tpl) => (
                    <TemplateRow key={tpl.id} template={tpl} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function groupByKind(
  templates: ResponseTemplate[]
): Partial<Record<ResponseTemplateKind, ResponseTemplate[]>> {
  const map: Partial<Record<ResponseTemplateKind, ResponseTemplate[]>> = {};
  for (const t of templates) {
    const list = map[t.kind] ?? [];
    list.push(t);
    map[t.kind] = list;
  }
  return map;
}
