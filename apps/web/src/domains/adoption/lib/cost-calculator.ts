/**
 * Calculateur de coûts d'adoption (3.2).
 *
 * Modèle déterministe basé sur une moyenne France 2025 issue de sources
 * publiques : Fédération nationale des syndicats vétérinaires (FSVF),
 * SACPA, panel grandes surfaces / pet-shops. Les chiffres sont des
 * fourchettes raisonnables, à présenter comme telles à l'utilisateur
 * (« estimation »).
 */

export type Species = "chat" | "chien";

export type ChienSize = "petit" | "moyen" | "grand" | "geant";

export type CatSize = "standard";

export type LifeStage = "junior" | "adulte" | "senior";

export type CareLevel = "basique" | "standard" | "premium";

export type Region = "ile_de_france" | "metropole" | "rural";

export interface CostInput {
  species: Species;
  size: ChienSize | CatSize;
  lifeStage: LifeStage;
  careLevel: CareLevel;
  region: Region;
  withInsurance: boolean;
}

export interface CostBreakdown {
  category: string;
  monthly: number;
  annual: number;
  note?: string;
}

export interface CostResult {
  monthly: number;
  annual: number;
  firstYearTotal: number;
  initialOneTime: number;
  breakdown: CostBreakdown[];
}

const REGION_VET_MULTIPLIER: Record<Region, number> = {
  ile_de_france: 1.35,
  metropole: 1.1,
  rural: 0.9,
};

const REGION_LABELS: Record<Region, string> = {
  ile_de_france: "Île-de-France",
  metropole: "Grandes métropoles",
  rural: "Reste de la France",
};

const CARE_MULTIPLIER: Record<CareLevel, number> = {
  basique: 0.75,
  standard: 1,
  premium: 1.45,
};

const CARE_LABELS: Record<CareLevel, string> = {
  basique: "Basique",
  standard: "Standard",
  premium: "Premium",
};

const CHIEN_SIZE_LABELS: Record<ChienSize, string> = {
  petit: "Petit (< 10 kg)",
  moyen: "Moyen (10-25 kg)",
  grand: "Grand (25-40 kg)",
  geant: "Géant (> 40 kg)",
};

const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  junior: "Chiot / chaton (< 1 an)",
  adulte: "Adulte (1-7 ans)",
  senior: "Senior (> 7 ans)",
};

const SPECIES_LABELS: Record<Species, string> = {
  chat: "Chat",
  chien: "Chien",
};

export const COST_LABELS = {
  species: SPECIES_LABELS,
  chienSize: CHIEN_SIZE_LABELS,
  lifeStage: LIFE_STAGE_LABELS,
  careLevel: CARE_LABELS,
  region: REGION_LABELS,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round(n: number): number {
  return Math.round(n);
}

// ─── Coûts mensuels (hors initial) ────────────────────────────────────────

function feedingMonthly(input: CostInput): number {
  // Approximation : prix au kilo × consommation mensuelle
  if (input.species === "chat") {
    // Chat ~50 g/jour soit ~1.5 kg/mois
    const pricePerKg = { basique: 5, standard: 9, premium: 15 }[input.careLevel];
    return 1.5 * pricePerKg;
  }
  const consumptionByMonthKg: Record<ChienSize, number> = {
    petit: 6,
    moyen: 12,
    grand: 18,
    geant: 25,
  };
  const pricePerKg = { basique: 3.5, standard: 6.5, premium: 11 }[
    input.careLevel
  ];
  return consumptionByMonthKg[input.size as ChienSize] * pricePerKg;
}

function litterMonthly(input: CostInput): number {
  if (input.species !== "chat") return 0;
  // 1 sac 10 kg ~12 EUR/mois standard, varie selon care level
  const base = { basique: 8, standard: 14, premium: 22 }[input.careLevel];
  return base;
}

function vetRoutineAnnual(input: CostInput): number {
  // Vaccin annuel + vermifuge × 4 + antiparasitaire externe × 12
  const base = input.species === "chat" ? 165 : 220;
  const ageMult = input.lifeStage === "senior" ? 1.4 : 1;
  return base * ageMult * REGION_VET_MULTIPLIER[input.region];
}

function vetUnplannedAnnual(input: CostInput): number {
  // Provision pour soins ponctuels (gastro, blessures, dentaire)
  const base = input.species === "chat" ? 180 : 280;
  const sizeMult =
    input.species === "chien"
      ? { petit: 0.9, moyen: 1, grand: 1.25, geant: 1.55 }[
          input.size as ChienSize
        ]
      : 1;
  const ageMult = input.lifeStage === "senior" ? 1.6 : 1;
  return base * sizeMult * ageMult * REGION_VET_MULTIPLIER[input.region];
}

function groomingMonthly(input: CostInput): number {
  if (input.species === "chat") {
    return input.careLevel === "premium" ? 8 : 0; // brossage maison sinon
  }
  // Toilettage 1× par 2 mois pour moyen/grand, plus rare pour petit
  const base: Record<ChienSize, number> = {
    petit: 6,
    moyen: 18,
    grand: 28,
    geant: 35,
  };
  const m = base[input.size as ChienSize];
  return m * CARE_MULTIPLIER[input.careLevel];
}

function accessoriesAnnual(input: CostInput): number {
  // Jouets + équipement renouvellement (amortis sur l'année)
  if (input.species === "chat") {
    return 60 * CARE_MULTIPLIER[input.careLevel];
  }
  const base: Record<ChienSize, number> = {
    petit: 90,
    moyen: 130,
    grand: 170,
    geant: 220,
  };
  return base[input.size as ChienSize] * CARE_MULTIPLIER[input.careLevel];
}

function insuranceMonthly(input: CostInput): number {
  if (!input.withInsurance) return 0;
  // Formule moyenne France 2025
  if (input.species === "chat") {
    return { basique: 12, standard: 22, premium: 38 }[input.careLevel];
  }
  const sizeMult: Record<ChienSize, number> = {
    petit: 0.95,
    moyen: 1.1,
    grand: 1.4,
    geant: 1.75,
  };
  const base = { basique: 18, standard: 32, premium: 55 }[input.careLevel];
  return base * sizeMult[input.size as ChienSize];
}

// ─── Coûts initiaux (1ère année uniquement) ───────────────────────────────

function initialOneTime(input: CostInput): number {
  // Adoption : frais refuge (généralement inclus stérilisation, ID, vaccins
  // pour pet refuge). On affiche un tampon « adoption » distinct côté UI.
  const adoptionFee = input.species === "chat" ? 130 : 200;
  // Équipement de base (panier/coussin, gamelles, transport, harnais/laisse,
  // arbre à chat ou bac).
  const equipement =
    input.species === "chat"
      ? 110
      : { petit: 130, moyen: 160, grand: 190, geant: 230 }[
          input.size as ChienSize
        ];
  // Identification (déjà incluse au refuge la plupart du temps, mais pour
  // achat secondaire on garde un tampon).
  return adoptionFee + equipement * CARE_MULTIPLIER[input.careLevel];
}

// ─── Calcul principal ─────────────────────────────────────────────────────

export function calculateCosts(input: CostInput): CostResult {
  const feeding = feedingMonthly(input);
  const litter = litterMonthly(input);
  const grooming = groomingMonthly(input);
  const insurance = insuranceMonthly(input);

  const vetRoutineAnnualVal = vetRoutineAnnual(input);
  const vetUnplannedAnnualVal = vetUnplannedAnnual(input);
  const accessoriesAnnualVal = accessoriesAnnual(input);

  const monthlyVet = (vetRoutineAnnualVal + vetUnplannedAnnualVal) / 12;
  const monthlyAccessories = accessoriesAnnualVal / 12;

  const breakdown: CostBreakdown[] = [
    {
      category: "Alimentation",
      monthly: round1(feeding),
      annual: round(feeding * 12),
    },
    ...(litter > 0
      ? [
          {
            category: "Litière",
            monthly: round1(litter),
            annual: round(litter * 12),
          },
        ]
      : []),
    {
      category: "Soins vétérinaires (routine + imprévus)",
      monthly: round1(monthlyVet),
      annual: round(vetRoutineAnnualVal + vetUnplannedAnnualVal),
      note: `dont ${round(vetRoutineAnnualVal)} € routine, ${round(
        vetUnplannedAnnualVal
      )} € imprévus`,
    },
    ...(grooming > 0
      ? [
          {
            category: "Toilettage",
            monthly: round1(grooming),
            annual: round(grooming * 12),
          },
        ]
      : []),
    {
      category: "Accessoires et jouets",
      monthly: round1(monthlyAccessories),
      annual: round(accessoriesAnnualVal),
    },
    ...(insurance > 0
      ? [
          {
            category: "Assurance santé",
            monthly: round1(insurance),
            annual: round(insurance * 12),
          },
        ]
      : []),
  ];

  const monthly = breakdown.reduce((s, b) => s + b.monthly, 0);
  const annual = breakdown.reduce((s, b) => s + b.annual, 0);
  const initial = initialOneTime(input);

  return {
    monthly: round(monthly),
    annual: round(annual),
    initialOneTime: round(initial),
    firstYearTotal: round(annual + initial),
    breakdown,
  };
}
