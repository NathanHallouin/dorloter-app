import { Icon } from "@dorloter/ui";
import { Btn, Eyebrow, Rule } from "@dorloter/ui";

const PRESS_EMAIL = "presse@dorloter.fr";

/** Les trois piliers, formulés pour un usage presse (repris tels quels par les journalistes). */
const PILIERS: [string, string, string][] = [
  ["heart", "Adoption responsable", "Une vitrine des refuges et associations partenaires, tous vérifiés (SIRET, agrément). Fiches détaillées, matching adoptant / animal, candidature en ligne."],
  ["radio", "Perdus & trouvés géolocalisé", "Un réseau de signalement qui rapproche automatiquement les animaux perdus et trouvés par localisation, espèce et description. Le différenciateur technique de Dorloter."],
  ["shieldCheck", "Pensions agréées", "Un annuaire de pensions professionnelles (SIRET et agrément préfecture contrôlés manuellement). Pas de garde entre particuliers."],
];

/** Ce qui distingue Dorloter, en points factuels. */
const REPERES: [string, string, string][] = [
  ["map", "Matching géolocalisé", "Un moteur de correspondance perdus/trouvés fondé sur PostGIS : distance, couleur, race, sexe et fenêtre temporelle produisent un score clair, affiché avec la distance."],
  ["globe", "Souveraineté européenne", "Hébergement en France, technologies ouvertes, aucune dépendance aux géants du cloud américains. Les données restent en Europe."],
  ["users", "Modèle associatif", "Une plateforme pensée pour le grand public et les associations, gratuite pour les adoptants, simple et chaleureuse."],
];

/** Questions fréquentes de la rédaction. */
const FAQ: [string, string][] = [
  [
    "Qu'est-ce que Dorloter ?",
    "Une plateforme web française qui réunit en un seul endroit l'adoption en refuge, un réseau de perdus & trouvés géolocalisé et un annuaire de professionnels de confiance (pensions agréées, vétérinaires).",
  ],
  [
    "Qui peut publier sur Dorloter ?",
    "Les refuges et associations partenaires pour l'adoption, et les pensions professionnelles disposant d'un SIRET et d'un agrément. Chaque partenaire est vérifié manuellement avant publication. Les particuliers peuvent signaler un animal perdu ou trouvé.",
  ],
  [
    "Comment fonctionne le rapprochement perdus / trouvés ?",
    "À chaque nouveau signalement, le système calcule un score de similarité avec les signalements proches (géolocalisation, description physique, date) et notifie les personnes concernées. Aucun rapprochement n'est imposé : chacun reste maître de son signalement.",
  ],
  [
    "Où sont hébergées les données ?",
    "Exclusivement chez des hébergeurs européens, en France. Dorloter s'inscrit dans une démarche de souveraineté numérique et n'utilise aucun service d'infrastructure des grands acteurs non européens.",
  ],
];

/**
 * Espace presse (8.3.5) : page statique à destination des journalistes.
 * Pitch réutilisable, piliers, repères, FAQ et contact presse.
 */
export function PressPage() {
  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[920px] px-8 pb-11 pt-14 text-center">
          <div className="inline-flex"><Eyebrow>Espace presse</Eyebrow></div>
          <h1 className="mt-4 text-[52px] font-semibold leading-[1.04] tracking-[-0.02em] text-foreground">
            La presse parle de <span className="serif-i text-coral-600">Dorloter</span>.
          </h1>
          <p className="lead-drop mx-auto mt-[22px] max-w-[680px] text-left text-[18px] leading-[1.65] text-foreground">
            Vous préparez un article, un reportage ou un sujet sur l'adoption animale et l'entraide entre propriétaires ?
            Cette page rassemble l'essentiel pour comprendre Dorloter et nous contacter rapidement.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={`mailto:${PRESS_EMAIL}`}><Btn icon="mail">Contacter le service presse</Btn></a>
            <a href={`mailto:${PRESS_EMAIL}?subject=Demande%20de%20kit%20media%20Dorloter`}>
              <Btn variant="outline" icon="download">Demander le kit média</Btn>
            </a>
          </div>
        </div>
      </section>

      {/* Pitch réutilisable */}
      <section className="mx-auto max-w-[920px] px-8 py-12">
        <Rule label="En bref" className="mb-7" />
        <blockquote className="rounded-[8px] border-l-[3px] border-coral-500 bg-card px-6 py-5 text-[17px] leading-[1.7] text-foreground">
          Dorloter est une plateforme web française qui réunit l'adoption en refuge, un réseau de perdus &amp; trouvés
          géolocalisé et un annuaire de professionnels de confiance. Sa promesse : rendre l'adoption responsable simple
          et chaleureuse, et mobiliser la communauté autour de chaque animal disparu grâce à un moteur de rapprochement
          géolocalisé. Une démarche associative et souveraine, hébergée en Europe.
        </blockquote>
        <p className="mt-3 text-[13px] text-muted-foreground">Extrait libre de droits, réutilisable tel quel dans vos publications.</p>
      </section>

      {/* Les trois piliers */}
      <section className="mx-auto max-w-[1080px] px-8 pb-12">
        <Rule label="Trois fonctions, une plateforme" className="mb-7" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[18px]">
          {PILIERS.map(([icon, title, desc]) => (
            <div key={title} className="rounded-[6px] border border-line bg-card p-[22px]">
              <span className="grid h-[42px] w-[42px] place-items-center rounded-[4px] border border-coral-300 bg-coral-50 text-coral-600"><Icon name={icon} size={21} /></span>
              <h3 className="mt-3.5 text-[20px] font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Repères */}
      <section className="mx-auto max-w-[1080px] px-8 pb-12">
        <Rule label="Ce qui nous distingue" className="mb-7" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[18px]">
          {REPERES.map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3.5 rounded-[6px] border border-line bg-background p-[18px]">
              <span className="mt-0.5 flex-none text-coral-500"><Icon name={icon} size={22} /></span>
              <div>
                <h3 className="text-[16px] font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-[13.5px] leading-[1.5] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ presse */}
      <section className="mx-auto max-w-[920px] px-8 pb-12">
        <Rule label="Questions fréquentes" className="mb-7" />
        <div className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-[6px] border border-line bg-card px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-semibold text-foreground">
                {q}
                <span className="flex-none text-muted-foreground transition-transform group-open:rotate-45"><Icon name="plus" size={18} /></span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact presse */}
      <section className="mx-auto max-w-[920px] px-8 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[8px] border border-coral-300 bg-coral-50 px-7 py-6">
          <div>
            <div className="mono text-[11px] font-semibold uppercase tracking-[0.1em] text-coral-700">Contact presse</div>
            <a href={`mailto:${PRESS_EMAIL}`} className="text-[24px] font-extrabold text-coral-700 hover:underline">{PRESS_EMAIL}</a>
            <p className="mt-1 text-[13.5px] text-coral-800">Interviews, visuels haute définition, données et témoignages sur demande.</p>
          </div>
          <a href={`mailto:${PRESS_EMAIL}`}><Btn icon="send">Écrire au service presse</Btn></a>
        </div>
      </section>
    </div>
  );
}
