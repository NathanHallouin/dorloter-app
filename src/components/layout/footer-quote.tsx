import { Quote } from "lucide-react";

const QUOTES: { text: string; attribution: string }[] = [
  {
    text: "Un chat n'est pas un cadeau, c'est un engagement de quinze ans.",
    attribution: "L'équipe Dorloter",
  },
  {
    text: "On n'adopte pas un animal pour ce qu'il est, on l'adopte pour ce qu'il devient avec nous.",
    attribution: "Anonyme",
  },
  {
    text: "Le temps passé avec un chat n'est jamais perdu.",
    attribution: "Sigmund Freud",
  },
  {
    text: "Un animal sauvé peut sauver, à son tour.",
    attribution: "L'équipe Dorloter",
  },
  {
    text: "Tant qu'on n'a pas aimé un animal, une partie de notre âme reste endormie.",
    attribution: "Anatole France",
  },
  {
    text: "L'amour pour les animaux est lié à la bonté de cœur.",
    attribution: "Bouddha",
  },
  {
    text: "Donner sa chance à un animal de refuge, c'est lui rendre la vie qu'il avait perdue.",
    attribution: "L'équipe Dorloter",
  },
  {
    text: "Ce que les chats nous apprennent, c'est la patience tranquille.",
    attribution: "Anonyme",
  },
  {
    text: "Un chien vous regardera comme s'il vous trouvait formidable, même si vous n'avez rien fait pour le mériter ce jour-là.",
    attribution: "Anne Lamott",
  },
  {
    text: "Avoir un animal chez soi, c'est rappeler tous les jours qu'on n'est pas le centre du monde.",
    attribution: "L'équipe Dorloter",
  },
];

/**
 * Citation du jour affichée dans le footer. Sélection déterministe basée
 * sur le jour de l'année — chaque visiteur voit la même citation un même
 * jour, ça change tous les jours, et ça reste stable au sein d'une session
 * (pas de hydration mismatch entre serveur et client).
 */
export function FooterQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const quote = QUOTES[dayOfYear % QUOTES.length]!;

  return (
    <div className="mt-10 flex items-start gap-2 border-t border-sable-200 pt-6">
      <Quote
        className="mt-0.5 h-4 w-4 shrink-0 text-coral-400"
        aria-hidden
      />
      <blockquote className="text-sm italic leading-relaxed text-muted-foreground">
        « {quote.text} »
        <cite className="not-italic">
          {" — "}
          <span className="text-foreground/80">{quote.attribution}</span>
        </cite>
      </blockquote>
    </div>
  );
}
