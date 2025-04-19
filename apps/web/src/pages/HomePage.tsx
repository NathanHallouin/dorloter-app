import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { petsApi } from "@/api/pets";
import { PetCard } from "@/components/PetCard";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/Icon";
import { Btn, Eyebrow, Marquee, Rule, Stamp } from "@/ui/primitives";

const HERO_IMG = "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80&auto=format&fit=crop";
// Chiffres vitrine (indicatifs) — à brancher sur un endpoint /stats ultérieurement.
const STATS: [string, string][] = [["248", "à adopter"], ["19", "recherches"], ["143", "retrouvailles"], ["8", "pensions"]];

const STEPS: [string, string, string, string][] = [
  ["01", "search", "Explorez", "Filtrez par espèce, âge et compatibilité avec votre foyer."],
  ["02", "message", "Échangez", "Contactez le refuge et posez toutes vos questions."],
  ["03", "shieldCheck", "Rencontrez", "Une visite est organisée avant toute décision."],
  ["04", "heart", "Accueillez", "Finalisez l'adoption et ramenez votre compagnon."],
];

export function HomePage() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["pets", "featured"], queryFn: () => petsApi.list({ limit: 4 }) });
  const featured = data?.data ?? [];

  return (
    <div>
      {/* ===================== COUVERTURE ===================== */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[1.04fr_.96fr] items-center gap-[52px] px-8 pb-10 pt-[46px] max-md:grid-cols-1">
          <div>
            <Eyebrow>Dossier du mois · Adoption</Eyebrow>
            <h1 className="mt-[18px] text-[60px] font-semibold leading-none tracking-[-0.02em] text-foreground">
              Chaque compagnon mérite qu'on le&nbsp;<span className="serif-i text-coral-600">dorlote</span>.
            </h1>
            <p className="lead-drop mt-[22px] max-w-[500px] text-[17.5px] leading-[1.6] text-foreground">
              Adopter, retrouver un animal perdu, ou confier le sien à une pension de confiance : la plateforme qui réunit
              refuges, familles et bénévoles autour d'une idée simple — prendre soin, ensemble.
            </p>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <Btn size="lg" icon="sparkles" onClick={() => navigate("/adopter")}>Trouver mon compagnon</Btn>
              <Btn size="lg" variant="outline" icon="radio" onClick={() => navigate("/perdus-trouves")}>Signaler un animal</Btn>
            </div>
            <div className="mt-7 flex items-center gap-3">
              <div className="flex">
                {featured.slice(0, 4).map((p, i) => (
                  <img key={p.id} src={p.primaryPhoto?.url ?? HERO_IMG} alt="" className={cn("h-[34px] w-[34px] rounded-[4px] border-2 border-background object-cover", i > 0 && "-ml-2")} />
                ))}
              </div>
              <p className="mono text-[11.5px] uppercase tracking-[0.04em] text-muted-foreground">
                <strong className="tabular text-foreground">+1 200</strong> adoptions · cette année
              </p>
            </div>
          </div>

          <div className="relative">
            <Stamp tone="prune" rotate={-8} style={{ position: "absolute", top: -12, left: -16, zIndex: 3 }}>★ Assoc. loi 1901</Stamp>
            <div className="aspect-[4/5] overflow-hidden border border-foreground bg-muted">
              <img src={HERO_IMG} alt="Animal à la une" className="h-full w-full object-cover" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">Cliché — à la une</span>
              <span className="mono text-[10.5px] text-muted-foreground">Refuges partenaires</span>
            </div>
          </div>
        </div>

        {/* en chiffres */}
        <div className="mx-auto max-w-[1180px] px-8 pb-10">
          <div className="grid grid-cols-[auto_repeat(4,1fr)] items-center border-b border-t-[1.5px] border-b-line border-t-foreground">
            <span className="mono border-r border-line py-5 pl-1 pr-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">En<br />chiffres</span>
            {STATS.map((s, i) => (
              <div key={i} className={cn("py-4 pl-[22px]", i < 3 && "border-r border-line")}>
                <div className="tabular font-display text-[44px] font-semibold leading-none text-foreground">{s[0]}</div>
                <div className="mono mt-[9px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Marquee tone="prune" items={["Adoption responsable", "Refuges partenaires", "+1 200 adoptions / an", "Perdus & trouvés", "Pensions agréées", "Association loi 1901"]} />

      {/* ===================== AU SOMMAIRE ===================== */}
      <section className="mx-auto max-w-[1180px] px-8 pb-2 pt-12">
        <Rule label="Au sommaire" className="mb-[30px]" />
        <div className="grid grid-cols-3 gap-5 max-md:grid-cols-1">
          <IntentionCard tone="coral" index="01" icon="heart" title="Adopter un animal" desc="Parcourez les chats et chiens de refuges près de chez vous. Filtrez par compatibilité et trouvez le bon match." cta="Voir le catalogue" onClick={() => navigate("/adopter")} />
          <IntentionCard tone="lavande" index="02" icon="radio" title="Signaler ou retrouver" desc="Publiez un animal perdu ou trouvé. Notre carte et nos alertes mobilisent la communauté autour de vous." cta="Ouvrir la carte" onClick={() => navigate("/perdus-trouves")} />
          <IntentionCard tone="prune" index="03" icon="home" title="Faire garder" desc="Trouvez une pension de confiance, vérifiée et notée, pour vos vacances ou vos absences." cta="Trouver une pension" onClick={() => navigate("/pensions")} />
        </div>
      </section>

      {/* ===================== À LA UNE ===================== */}
      <section className="mx-auto max-w-[1180px] px-8 pb-2 pt-[52px]">
        <div className="mb-[22px] flex items-end justify-between border-b-[1.5px] border-foreground pb-4">
          <div>
            <Eyebrow>Coups de cœur</Eyebrow>
            <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.01em] text-foreground">Ils cherchent un foyer</h2>
          </div>
          <Btn variant="ghost" iconRight="arrow" onClick={() => navigate("/adopter")}>Tout le catalogue</Btn>
        </div>
        {featured.length > 0 ? (
          <div className="grid grid-cols-4 gap-[18px] max-md:grid-cols-2">
            {featured.map((p) => <PetCard key={p.id} pet={p} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">Bientôt des animaux à l'adoption.</p>
        )}
      </section>

      {/* ===================== DÉMARCHE ===================== */}
      <section className="mx-auto max-w-[1180px] px-8 py-14">
        <div className="relative overflow-hidden rounded-[6px] bg-prune-900 px-12 py-[46px] text-sable-100">
          <div aria-hidden className="absolute -right-10 -top-10 text-white/[0.05]"><Icon name="paw" size={220} /></div>
          <div className="relative grid grid-cols-2 items-center gap-11 max-md:grid-cols-1">
            <div>
              <p className="mono text-[11px] font-semibold uppercase tracking-[0.16em] text-lavande-300">Mode d'emploi</p>
              <h2 className="mt-3 text-[38px] font-semibold leading-[1.05] tracking-[-0.01em] text-sable-50">Un parcours simple, pensé pour bien faire</h2>
              <p className="serif-i mt-4 max-w-[420px] text-[19px] leading-[1.5] text-sable-200">
                On ne précipite jamais une adoption. Chaque étape protège l'animal autant que vous.
              </p>
              <div className="mt-7"><Btn variant="white" icon="compass" onClick={() => navigate("/adopter")}>Commencer le parcours</Btn></div>
            </div>
            <div className="flex flex-col">
              {STEPS.map((s, i) => (
                <div key={s[0]} className={cn("flex items-start gap-4 py-3.5", i > 0 && "border-t border-white/[0.14]")}>
                  <span className="mono tabular w-6 flex-none pt-0.5 text-[13px] font-semibold text-lavande-300">{s[0]}</span>
                  <div>
                    <div className="flex items-center gap-2.5 font-display text-[19px] font-semibold text-sable-50"><Icon name={s[1]} size={17} /> {s[2]}</div>
                    <div className="mt-[3px] text-[13.5px] text-sable-300">{s[3]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const RUBRIC: Record<string, { text: string; tile: string }> = {
  coral: { text: "text-coral-600", tile: "border-coral-300 bg-coral-50 text-coral-600" },
  lavande: { text: "text-lavande-600", tile: "border-lavande-300 bg-lavande-50 text-lavande-600" },
  prune: { text: "text-prune-600", tile: "border-prune-300 bg-prune-50 text-prune-600" },
};

function IntentionCard({ tone, index, icon, title, desc, cta, onClick }: { tone: string; index: string; icon: string; title: string; desc: string; cta: string; onClick: () => void }) {
  const t = RUBRIC[tone] ?? RUBRIC.coral!;
  return (
    <button onClick={onClick} className="flex cursor-pointer flex-col rounded-[4px] border border-line bg-card px-6 pb-[22px] pt-6 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-[3px] hover:border-coral-400 hover:shadow-[0_16px_34px_rgba(20,16,8,.10)]">
      <div className="flex items-center justify-between">
        <span className={cn("mono text-[11px] font-semibold uppercase tracking-[0.16em]", t.text)}>Rubrique {index}</span>
        <span className={cn("grid h-[42px] w-[42px] flex-none place-items-center rounded-[4px] border", t.tile)}><Icon name={icon} size={21} /></span>
      </div>
      <div className="my-[15px] h-px bg-line" />
      <h3 className="text-[25px] font-semibold leading-[1.05] tracking-[-0.01em] text-foreground">{title}</h3>
      <p className="mt-[9px] text-[14.5px] leading-[1.55] text-muted-foreground">{desc}</p>
      <div className="mt-[18px] inline-flex items-center gap-[7px]">
        <span className="mono inline-flex items-center gap-[7px] border-b-2 border-coral-500 pb-0.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-foreground">
          {cta} <Icon name="arrow" size={15} />
        </span>
      </div>
    </button>
  );
}
