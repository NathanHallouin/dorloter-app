import { Link } from "react-router-dom";
import { Icon } from "@/ui/Icon";
import { Btn, Eyebrow, Rule } from "@/ui/primitives";

const VALUES: [string, string, string][] = [
  ["heart", "Le bien-être d'abord", "Aucune adoption n'est précipitée. Chaque étape protège l'animal autant que la famille."],
  ["shieldCheck", "Des partenaires vérifiés", "Refuges, pensions et vétérinaires sont contrôlés (SIRET, agrément) avant publication."],
  ["radio", "La force du collectif", "Perdus & trouvés mobilise la communauté autour de chaque signalement géolocalisé."],
  ["globe", "Souveraineté numérique", "Hébergement européen, technologies ouvertes, aucune dépendance aux géants du cloud."],
];

export function AboutPage() {
  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[920px] px-8 pb-11 pt-14 text-center">
          <div className="inline-flex"><Eyebrow>Notre mission</Eyebrow></div>
          <h1 className="mt-4 text-[52px] font-semibold leading-[1.04] tracking-[-0.02em] text-foreground">
            Aider chaque animal à trouver, ou retrouver, son <span className="serif-i text-coral-600">foyer</span>.
          </h1>
          <p className="lead-drop mx-auto mt-[22px] max-w-[680px] text-left text-[18px] leading-[1.65] text-foreground">
            Dorloter réunit en un seul endroit l'adoption en refuge, le réseau de perdus & trouvés géolocalisé et
            l'annuaire des professionnels de confiance (pensions agréées, vétérinaires). Une plateforme associative,
            pensée pour être simple, chaleureuse et utile, du premier clic jusqu'aux retrouvailles.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1080px] px-8 py-12">
        <Rule label="Nos valeurs" className="mb-7" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
          {VALUES.map(([icon, title, desc]) => (
            <div key={title} className="rounded-[6px] border border-line bg-card p-[22px]">
              <span className="grid h-[42px] w-[42px] place-items-center rounded-[4px] border border-coral-300 bg-coral-50 text-coral-600"><Icon name={icon} size={21} /></span>
              <h3 className="mt-3.5 text-[20px] font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1080px] px-8 pb-[60px]">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[6px] bg-prune-900 px-12 py-11 text-sable-100">
          <div>
            <h2 className="text-[32px] font-semibold tracking-[-0.01em] text-sable-50">Prêt à faire une rencontre ?</h2>
            <p className="serif-i mt-2 text-[18px] text-sable-200">Des centaines de compagnons attendent leur famille.</p>
          </div>
          <Link to="/adopter"><Btn variant="white" size="lg" iconRight="arrow">Voir le catalogue</Btn></Link>
        </div>
      </section>
    </div>
  );
}
