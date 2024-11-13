"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cat,
  Dog,
  Home,
  Building2,
  Trees,
  Sparkles,
  Heart,
  Clock,
  Baby,
  RotateCcw,
} from "lucide-react";
import { cn } from "@shared/utils";

interface Choice {
  value: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}

interface Question {
  id: string;
  prompt: string;
  helper?: string;
  choices: Choice[];
}

const QUESTIONS: Question[] = [
  {
    id: "species",
    prompt: "Vous penchez plutôt vers...",
    helper: "Pour démarrer, on filtre selon votre préférence.",
    choices: [
      { value: "chat", label: "Un chat", icon: <Cat className="h-5 w-5" /> },
      { value: "chien", label: "Un chien", icon: <Dog className="h-5 w-5" /> },
      {
        value: "any",
        label: "Aucune préférence",
        hint: "On vous montre les deux.",
        icon: <Sparkles className="h-5 w-5" />,
      },
    ],
  },
  {
    id: "housing",
    prompt: "Où vivez-vous ?",
    choices: [
      {
        value: "apartment",
        label: "Appartement",
        icon: <Building2 className="h-5 w-5" />,
      },
      {
        value: "house",
        label: "Maison",
        icon: <Home className="h-5 w-5" />,
      },
    ],
  },
  {
    id: "outdoor",
    prompt: "Avez-vous un jardin ou un balcon sécurisé ?",
    choices: [
      {
        value: "yes",
        label: "Oui",
        hint: "Idéal pour un chien ou un chat sortant.",
        icon: <Trees className="h-5 w-5" />,
      },
      {
        value: "no",
        label: "Non",
        hint: "On privilégiera les chats d'intérieur.",
      },
    ],
  },
  {
    id: "children",
    prompt: "Y a-t-il des enfants à la maison ?",
    helper: "On filtre les profils compatibles.",
    choices: [
      {
        value: "young",
        label: "Oui, des jeunes enfants",
        icon: <Baby className="h-5 w-5" />,
      },
      {
        value: "older",
        label: "Oui, plus grands",
      },
      {
        value: "no",
        label: "Pas d'enfants",
      },
    ],
  },
  {
    id: "otherPets",
    prompt: "Avez-vous déjà des animaux ?",
    choices: [
      { value: "cat", label: "Un chat", icon: <Cat className="h-5 w-5" /> },
      { value: "dog", label: "Un chien", icon: <Dog className="h-5 w-5" /> },
      { value: "both", label: "Les deux" },
      { value: "none", label: "Aucun" },
    ],
  },
  {
    id: "experience",
    prompt: "C'est votre premier animal ?",
    helper: "Pas de jugement · on adapte la recommandation.",
    choices: [
      {
        value: "first",
        label: "Oui, premier compagnon",
        hint: "On évite les profils exigeants.",
      },
      {
        value: "experienced",
        label: "J'ai déjà eu un animal",
      },
    ],
  },
  {
    id: "time",
    prompt: "Combien de temps pouvez-vous lui consacrer chaque jour ?",
    choices: [
      {
        value: "low",
        label: "Peu · je travaille à l'extérieur",
        hint: "Plutôt un chat adulte tranquille.",
        icon: <Clock className="h-5 w-5" />,
      },
      {
        value: "medium",
        label: "Le matin et le soir",
      },
      {
        value: "high",
        label: "Beaucoup · je télétravaille ou je suis dispo",
        hint: "Un chiot ou un chien sportif est jouable.",
        icon: <Heart className="h-5 w-5" />,
      },
    ],
  },
];

type Answers = Partial<Record<string, string>>;

interface ComputedRecommendation {
  filters: Record<string, string>;
  highlights: string[];
}

/**
 * Convertit les réponses en filtres pour `/adopter/liste` + bullet-points
 * récapitulatifs montrés sur la page résultats. Pas de magie : le quiz
 * sert à pré-remplir des filtres existants, pas à scorer en base.
 */
function computeRecommendation(answers: Answers): ComputedRecommendation {
  const filters: Record<string, string> = {};
  const highlights: string[] = [];

  if (answers.species && answers.species !== "any") {
    filters.species = answers.species;
    highlights.push(
      answers.species === "chat"
        ? "Vous préférez un chat · on filtre les profils félins."
        : "Vous préférez un chien · on filtre les profils canins."
    );
  } else {
    highlights.push("Vous gardez les deux espèces · on ne filtre pas.");
  }

  if (answers.children === "young" || answers.children === "older") {
    filters.okWithChildren = "oui";
    highlights.push(
      "On ne montre que les profils marqués comme compatibles avec les enfants."
    );
  }

  if (answers.otherPets === "cat" || answers.otherPets === "both") {
    filters.okWithCats = "oui";
    highlights.push("Compatible avec un chat déjà présent.");
  }
  if (answers.otherPets === "dog" || answers.otherPets === "both") {
    filters.okWithDogs = "oui";
    highlights.push("Compatible avec un chien déjà présent.");
  }

  // Suggestions d'âge : pas un filtre dur, on l'affiche en hint
  if (answers.experience === "first" || answers.time === "low") {
    highlights.push(
      "Privilégiez un animal adulte · moins exigeant et déjà éduqué."
    );
  }
  if (answers.time === "high" && answers.species !== "chat") {
    highlights.push(
      "Avec beaucoup de temps disponible, un jeune chien est envisageable."
    );
  }

  if (answers.housing === "apartment" && filters.species !== "chien") {
    highlights.push(
      "En appartement, les chats sont les compagnons les plus adaptés."
    );
  }
  if (answers.outdoor === "no" && filters.species === "chat") {
    highlights.push("Sans extérieur, ciblez les chats d'intérieur uniquement.");
  }

  return { filters, highlights };
}

export function MatchQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const total = QUESTIONS.length;
  const isResults = step >= total;
  const current = QUESTIONS[step];

  function answer(value: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  function reset() {
    setAnswers({});
    setStep(0);
  }

  if (isResults) {
    const { filters, highlights } = computeRecommendation(answers);
    const queryString = new URLSearchParams(filters).toString();
    const targetUrl = `/adopter/liste${queryString ? `?${queryString}` : ""}`;

    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <div className="mx-auto max-w-xl text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-coral-50 text-coral-500"
            aria-hidden
          >
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Voici ce qui vous correspond
          </h2>
          <p className="mt-2 text-muted-foreground">
            On a traduit vos réponses en filtres. Vous pouvez ajuster ensuite.
          </p>
        </div>

        {highlights.length > 0 && (
          <ul className="mx-auto mt-8 max-w-xl space-y-2.5 rounded-2xl border border-border bg-muted/30 p-5">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
                <span className="text-foreground">{h}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={targetUrl}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-coral-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-coral-600"
          >
            Voir les profils compatibles
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-medium text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" />
            Refaire le quiz
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Le quiz n&apos;enregistre rien · vos réponses restent dans votre
          navigateur.
        </p>
      </div>
    );
  }

  if (!current) return null;
  const progress = ((step + 1) / total) * 100;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Question {step + 1} / {total}
          </span>
          <span className="tabular-nums">{Math.round(progress)} %</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sable-200">
          <div
            className="h-full rounded-full bg-coral-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
      </div>

      {/* Question */}
      <fieldset>
        <legend className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {current.prompt}
        </legend>
        {current.helper && (
          <p className="mt-2 text-sm text-muted-foreground">
            {current.helper}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {current.choices.map((choice) => {
            const selected = answers[current.id] === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => answer(choice.value)}
                aria-pressed={selected}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-coral-300 hover:bg-coral-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400",
                  selected
                    ? "border-coral-400 bg-coral-50"
                    : "border-border"
                )}
              >
                {choice.icon && (
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral-50 text-coral-600 group-hover:bg-coral-100">
                    {choice.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    {choice.label}
                  </span>
                  {choice.hint && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {choice.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </button>
        <Link
          href="/adopter"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Passer le quiz
        </Link>
      </div>
    </div>
  );
}
