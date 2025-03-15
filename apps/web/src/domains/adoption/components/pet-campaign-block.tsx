import { ExternalLink, HeartHandshake } from "lucide-react";

interface PetCampaignBlockProps {
  url: string;
  title: string | null;
  description: string | null;
  goalAmount: string | null;
  collectedAmount: string | null;
  petName: string;
}

/**
 * Encart « Aider à payer ses soins » sur la fiche publique d'un animal.
 * Affiche un titre, description, jauge transparence (montants saisis
 * manuellement par le refuge), et CTA sortant vers la plateforme de
 * collecte externe. Dorloter ne traite aucun paiement.
 */
export function PetCampaignBlock({
  url,
  title,
  description,
  goalAmount,
  collectedAmount,
  petName,
}: PetCampaignBlockProps) {
  const goal = goalAmount ? Number(goalAmount) : null;
  const collected = collectedAmount ? Number(collectedAmount) : 0;
  const hasGauge = goal !== null && goal > 0;
  const percent = hasGauge
    ? Math.min(100, Math.max(0, (collected / goal) * 100))
    : 0;

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-coral-200 bg-gradient-to-br from-coral-50 to-white p-5">
      <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-700">
        <HeartHandshake className="h-3 w-3" />
        Aider {petName}
      </div>
      <h2 className="text-xl font-bold text-foreground">
        {title?.trim() || `Aidez à payer les soins de ${petName}`}
      </h2>

      {description?.trim() && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
          {description}
        </p>
      )}

      {hasGauge && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-coral-700">
              {formatCurrency(collected)} collectés
            </span>
            <span className="text-xs text-muted-foreground">
              sur {formatCurrency(goal)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-coral-100">
            <div
              className="h-full rounded-full bg-coral-500 transition-all"
              style={{ width: `${percent}%` }}
              aria-label={`${Math.round(percent)} pour cent`}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Montants saisis et tenus à jour par le refuge.
          </p>
        </div>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
      >
        <ExternalLink className="h-4 w-4" />
        Soutenir la campagne
      </a>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Vous serez redirigé·e vers la plateforme de collecte du refuge.
        Dorloter ne traite aucun paiement.
      </p>
    </section>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
