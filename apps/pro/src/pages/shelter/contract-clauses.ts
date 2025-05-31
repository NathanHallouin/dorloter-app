/**
 * Clauses standard des contrats (cochables). La clé est stockée dans
 * contract.terms (jsonb) ; le label sert au formulaire et au document.
 */
export interface ClauseDef {
  key: string;
  label: string;
}

export const ADOPTION_CLAUSES: ClauseDef[] = [
  { key: "identificationAJour", label: "Animal identifié (puce ou tatouage), identification à jour" },
  { key: "vaccinationAJour", label: "Vaccinations à jour à la remise de l'animal" },
  { key: "sterilise", label: "Animal stérilisé" },
  { key: "sterilisationEngagee", label: "Engagement de stérilisation (si non encore stérilisé)" },
  { key: "certificatEngagement", label: "Certificat d'engagement et de connaissance signé (loi du 30 nov. 2021)" },
  { key: "nonAbandon", label: "Engagement de ne jamais abandonner l'animal" },
  { key: "retourRefuge", label: "Restitution au refuge en cas d'impossibilité de garder l'animal" },
  { key: "droitDeSuite", label: "Droit de suite du refuge (nouvelles, visite de contrôle possible)" },
  { key: "pasDeRevente", label: "Interdiction de revendre ou céder l'animal à un tiers" },
];

export const FOSTER_CLAUSES: ClauseDef[] = [
  { key: "proprieteAssociation", label: "L'animal reste la propriété de l'association" },
  { key: "fraisVetoPrisEnCharge", label: "Frais vétérinaires pris en charge par l'association" },
  { key: "alimentationFournie", label: "Alimentation et matériel fournis par l'association" },
  { key: "soinsQuotidiens", label: "Soins quotidiens et bien-être assurés par la famille d'accueil" },
  { key: "restitutionSurDemande", label: "Restitution de l'animal sur demande de l'association" },
  { key: "pasDeCession", label: "Interdiction de céder ou confier l'animal à un tiers" },
];

export function clausesFor(type: string): ClauseDef[] {
  return type === "foster" ? FOSTER_CLAUSES : ADOPTION_CLAUSES;
}
