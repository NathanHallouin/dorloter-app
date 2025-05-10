import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@dorloter/ui";
import { Btn, Eyebrow } from "@dorloter/ui";

type Choice = { value: string; label: string; hint?: string; icon?: string };
type Question = { id: string; prompt: string; helper?: string; choices: Choice[] };

const QUESTIONS: Question[] = [
  { id: "species", prompt: "Vous penchez plutôt vers…", helper: "Pour démarrer, on filtre selon votre préférence.", choices: [
    { value: "chat", label: "Un chat", icon: "cat" }, { value: "chien", label: "Un chien", icon: "dog" }, { value: "any", label: "Aucune préférence", hint: "On vous montre les deux.", icon: "sparkles" } ] },
  { id: "housing", prompt: "Où vivez-vous ?", choices: [ { value: "apartment", label: "Appartement", icon: "building" }, { value: "house", label: "Maison", icon: "home" } ] },
  { id: "outdoor", prompt: "Avez-vous un jardin ou un balcon sécurisé ?", choices: [ { value: "yes", label: "Oui", hint: "Idéal pour un chien ou un chat sortant.", icon: "trees" }, { value: "no", label: "Non", hint: "On privilégiera les chats d'intérieur." } ] },
  { id: "children", prompt: "Y a-t-il des enfants à la maison ?", helper: "On filtre les profils compatibles.", choices: [ { value: "young", label: "Oui, des jeunes enfants", icon: "baby" }, { value: "older", label: "Oui, plus grands" }, { value: "no", label: "Pas d'enfants" } ] },
  { id: "otherPets", prompt: "Avez-vous déjà des animaux ?", choices: [ { value: "cat", label: "Un chat", icon: "cat" }, { value: "dog", label: "Un chien", icon: "dog" }, { value: "both", label: "Les deux" }, { value: "none", label: "Aucun" } ] },
  { id: "experience", prompt: "C'est votre premier animal ?", helper: "Pas de jugement, on adapte la recommandation.", choices: [ { value: "first", label: "Oui, premier compagnon", hint: "On évite les profils exigeants." }, { value: "experienced", label: "J'ai déjà eu un animal" } ] },
  { id: "time", prompt: "Combien de temps pouvez-vous lui consacrer chaque jour ?", choices: [ { value: "low", label: "Peu, je travaille à l'extérieur", hint: "Plutôt un chat adulte tranquille.", icon: "clock" }, { value: "medium", label: "Le matin et le soir" }, { value: "high", label: "Beaucoup, je télétravaille", hint: "Un chiot ou un chien sportif est jouable.", icon: "heart" } ] },
];

function computeRecommendation(a: Record<string, string>) {
  const filters: { species?: string } = {};
  const highlights: string[] = [];
  if (a.species && a.species !== "any") {
    filters.species = a.species;
    highlights.push(a.species === "chat" ? "Vous préférez un chat, on filtre les profils félins." : "Vous préférez un chien, on filtre les profils canins.");
  } else highlights.push("Vous gardez les deux espèces, on ne filtre pas.");
  if (a.children === "young" || a.children === "older") highlights.push("On privilégie les profils compatibles avec les enfants.");
  if (a.otherPets === "cat" || a.otherPets === "both") highlights.push("Compatible avec un chat déjà présent.");
  if (a.otherPets === "dog" || a.otherPets === "both") highlights.push("Compatible avec un chien déjà présent.");
  if (a.experience === "first" || a.time === "low") highlights.push("Privilégiez un animal adulte, moins exigeant et déjà éduqué.");
  if (a.housing === "apartment" && filters.species !== "chien") highlights.push("En appartement, les chats sont les compagnons les plus adaptés.");
  if (a.outdoor === "no" && filters.species === "chat") highlights.push("Sans extérieur, ciblez les chats d'intérieur uniquement.");
  return { filters, highlights };
}

export function QuizPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const total = QUESTIONS.length;
  const isResults = step >= total;
  const current = QUESTIONS[step];

  const answer = (v: string) => { setAnswers((p) => ({ ...p, [current!.id]: v })); setStep((s) => s + 1); };
  const goCatalog = () => {
    const { filters } = computeRecommendation(answers);
    navigate(filters.species ? `/adopter?species=${filters.species}` : "/adopter");
  };

  return (
    <div className="mx-auto max-w-[740px] px-6 pb-[72px] pt-10">
      <div className="mb-[26px] text-center">
        <Eyebrow>Trouver mon compagnon</Eyebrow>
        <h1 className="mt-3 text-[40px] font-semibold tracking-[-0.01em] text-foreground">
          Le quiz de <span className="serif-i text-coral-600">compatibilité</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[460px] text-[15.5px] leading-[1.55] text-muted-foreground">
          Sept questions pour traduire votre mode de vie en profils d'animaux qui vous correspondent.
        </p>
      </div>

      {isResults ? (
        <div className="rounded-2xl border border-line bg-card p-[clamp(24px,5vw,44px)]">
          <div className="mx-auto max-w-[460px] text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-coral-300 bg-coral-50 text-coral-600"><Icon name="sparkles" size={30} /></span>
            <h2 className="mt-[18px] text-[30px] font-semibold tracking-[-0.01em] text-foreground">Voici ce qui vous correspond</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">On a traduit vos réponses en pistes. Vous pourrez ajuster les filtres ensuite.</p>
          </div>
          <ul className="mx-auto mt-7 flex max-w-[520px] list-none flex-col gap-[11px] rounded-card border border-line bg-tint-coral p-5">
            {computeRecommendation(answers).highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-foreground">
                <span className="mt-px flex-none text-coral-600"><Icon name="check" size={17} /></span>{h}
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-7 flex max-w-[520px] flex-wrap justify-center gap-3">
            <Btn size="lg" iconRight="arrow" onClick={goCatalog}>Voir les profils compatibles</Btn>
            <Btn size="lg" variant="outline" icon="rotate" onClick={() => { setAnswers({}); setStep(0); }}>Refaire le quiz</Btn>
          </div>
          <p className="mono mt-[22px] text-center text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
            Le quiz n'enregistre rien · vos réponses restent dans votre navigateur.
          </p>
        </div>
      ) : current ? (
        <div className="rounded-2xl border border-line bg-card p-[clamp(22px,4vw,40px)]">
          <div className="mb-[26px]">
            <div className="mono mb-[9px] flex justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span>Question {step + 1} / {total}</span>
              <span className="tabular">{Math.round(((step + 1) / total) * 100)} %</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-coral-500 transition-[width] duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
            </div>
          </div>
          <h2 className="text-[27px] font-semibold leading-[1.12] tracking-[-0.01em] text-foreground">{current.prompt}</h2>
          {current.helper && <p className="mt-2 text-[14px] text-muted-foreground">{current.helper}</p>}
          <div className="mt-[22px] grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {current.choices.map((c) => (
              <button key={c.value} onClick={() => answer(c.value)} className="flex cursor-pointer items-start gap-3 rounded-card border border-line bg-card p-4 text-left transition-colors hover:border-coral-300 hover:bg-tint-coral">
                {c.icon && <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] border border-coral-300 bg-coral-50 text-coral-600"><Icon name={c.icon} size={19} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] font-semibold text-foreground">{c.label}</span>
                  {c.hint && <span className="mt-[3px] block text-[12.5px] leading-[1.4] text-muted-foreground">{c.hint}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-[26px] flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="mono inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40">
              <Icon name="chevron" size={14} className="rotate-180" /> Précédent
            </button>
            <button onClick={() => navigate("/adopter")} className="mono cursor-pointer text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">Passer le quiz</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
