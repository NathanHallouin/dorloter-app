/**
 * Variables supportées dans les templates de réponse aux candidatures.
 * Tout est en double accolades type Handlebars, sans espace interne.
 */

export const TEMPLATE_VARIABLES = {
  nomCandidat: "Nom complet du candidat",
  prenomCandidat: "Prénom du candidat (premier mot du nom)",
  nomAnimal: "Nom de l'animal concerné",
  nomRefuge: "Nom du refuge",
} as const;

export type TemplateContext = {
  nomCandidat?: string;
  prenomCandidat?: string;
  nomAnimal?: string;
  nomRefuge?: string;
};

/**
 * Remplit `{{variable}}` par sa valeur. Une variable non fournie est
 * remplacée par chaîne vide (plutôt que de laisser le marqueur cru).
 */
export function renderTemplate(
  body: string,
  context: TemplateContext
): string {
  return body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = (context as Record<string, string | undefined>)[key];
    return value ?? "";
  });
}

/**
 * Build le contexte standard depuis (candidat full name, animal, refuge).
 * Le prénom est dérivé via split sur le premier espace. Tous les champs
 * peuvent être manquants : ils résolvent alors à chaîne vide.
 */
export function buildTemplateContext(params: {
  applicantName?: string | null;
  petName?: string | null;
  shelterName?: string | null;
}): TemplateContext {
  const applicantName = params.applicantName?.trim() ?? "";
  const prenom = applicantName.split(/\s+/)[0] ?? "";
  return {
    nomCandidat: applicantName,
    prenomCandidat: prenom,
    nomAnimal: params.petName ?? "",
    nomRefuge: params.shelterName ?? "",
  };
}
