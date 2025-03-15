/**
 * Parser CSV minimal + heuristiques de mapping pour l'import refuge.
 * Pas de dépendance externe : RFC 4180 strict suffit pour les exports
 * Filalapat / Excel / Google Sheets standards.
 */

export type PetField =
  | "name"
  | "species"
  | "breed"
  | "color"
  | "sex"
  | "ageCategory"
  | "description"
  | "isSterilized"
  | "isChipped"
  | "isVaccinated"
  | "okWithCats"
  | "okWithDogs"
  | "okWithChildren"
  | "specialNeeds";

export const PET_FIELDS: readonly PetField[] = [
  "name",
  "species",
  "breed",
  "color",
  "sex",
  "ageCategory",
  "description",
  "isSterilized",
  "isChipped",
  "isVaccinated",
  "okWithCats",
  "okWithDogs",
  "okWithChildren",
  "specialNeeds",
];

export const PET_FIELD_LABELS: Record<PetField, string> = {
  name: "Nom",
  species: "Espèce (chat / chien)",
  breed: "Race",
  color: "Couleur",
  sex: "Sexe (male / femelle / inconnu)",
  ageCategory: "Catégorie d'âge",
  description: "Description",
  isSterilized: "Stérilisé (oui/non)",
  isChipped: "Identifié·e (oui/non)",
  isVaccinated: "Vacciné·e (oui/non)",
  okWithCats: "OK chats (oui/non/inconnu)",
  okWithDogs: "OK chiens (oui/non/inconnu)",
  okWithChildren: "OK enfants (oui/non/inconnu)",
  specialNeeds: "Besoins spécifiques",
};

/**
 * Parse une chaîne CSV en lignes de cellules. Gère :
 *   - quotes autour des cellules (avec quotes échappées par doublement)
 *   - séparateur configurable (auto-détection virgule/point-virgule/tab)
 *   - sauts de ligne dans cellules quotées
 *   - lignes vides ignorées en fin
 */
export function parseCSV(input: string): string[][] {
  const sep = detectSeparator(input);
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && input[i + 1] === "\n") i += 1;
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function detectSeparator(input: string): string {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const counts: Array<[string, number]> = [
    [",", (firstLine.match(/,/g) ?? []).length],
    [";", (firstLine.match(/;/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
  ];
  let best = counts[0]!;
  for (const c of counts) if (c[1] > best[1]) best = c;
  return best[0];
}

/**
 * Heuristique : pour chaque colonne du CSV (header normalisé), suggère le
 * champ pet correspondant. Retourne un Map<columnIndex, PetField>.
 */
const HEADER_ALIASES: Record<PetField, string[]> = {
  name: ["nom", "name", "prénom", "prenom", "petname", "pet_name", "animal"],
  species: ["espece", "espèce", "species", "type", "categorie", "catégorie"],
  breed: ["race", "breed"],
  color: ["couleur", "color", "robe", "pelage"],
  sex: ["sexe", "sex", "genre", "gender"],
  ageCategory: [
    "age",
    "âge",
    "agecategory",
    "age_category",
    "categorie_age",
    "catégorie d'âge",
    "categorie",
    "catégorie",
    "age category",
  ],
  description: ["description", "desc", "histoire", "presentation", "présentation", "bio"],
  isSterilized: ["sterilise", "stérilisé", "sterilized", "sterilisation", "castration"],
  isChipped: ["identifie", "identifié", "chipped", "puce", "icad", "transponder"],
  isVaccinated: ["vaccine", "vacciné", "vaccinated", "vaccination", "vaccins"],
  okWithCats: ["okchats", "ok_chats", "ok chats", "okcats", "compatible chats"],
  okWithDogs: ["okchiens", "ok_chiens", "ok chiens", "okdogs", "compatible chiens"],
  okWithChildren: ["okenfants", "ok_enfants", "ok enfants", "okkids", "compatible enfants"],
  specialNeeds: [
    "besoins",
    "besoinsspeciaux",
    "besoins spéciaux",
    "specialneeds",
    "special_needs",
    "regime",
    "régime",
    "remarques medicales",
  ],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\-\s]+/g, " ")
    .trim();
}

export function suggestMapping(headers: string[]): Map<number, PetField> {
  const map = new Map<number, PetField>();
  const used = new Set<PetField>();
  for (let i = 0; i < headers.length; i++) {
    const h = normalize(headers[i] ?? "");
    if (!h) continue;
    for (const field of PET_FIELDS) {
      if (used.has(field)) continue;
      const aliases = HEADER_ALIASES[field] ?? [];
      if (aliases.some((alias) => normalize(alias) === h)) {
        map.set(i, field);
        used.add(field);
        break;
      }
    }
  }
  return map;
}

/**
 * Convertit valeurs FR libres vers le format attendu par le schema Zod
 * d'un pet (booléens, enums).
 */
export function normalizeValue(
  field: PetField,
  raw: string
): string | boolean | null {
  const v = raw.trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  if (
    field === "isSterilized" ||
    field === "isChipped" ||
    field === "isVaccinated"
  ) {
    if (["oui", "yes", "true", "1", "x", "✓", "o"].includes(lower)) return true;
    if (["non", "no", "false", "0", "n"].includes(lower)) return false;
    return null;
  }
  if (field === "species") {
    if (lower.startsWith("chat") || lower.startsWith("cat") || lower === "felin")
      return "chat";
    if (lower.startsWith("chien") || lower.startsWith("dog") || lower === "canin")
      return "chien";
    return null;
  }
  if (field === "sex") {
    if (lower.startsWith("m") || lower === "male" || lower === "male") return "male";
    if (lower.startsWith("f") || lower === "femelle" || lower === "female")
      return "femelle";
    return "inconnu";
  }
  if (field === "ageCategory") {
    if (lower.includes("chaton") || lower.includes("chiot") || lower.includes("bebe"))
      return "chaton";
    if (lower.includes("jeune") || lower.includes("juvenile")) return "jeune";
    if (lower.includes("senior") || lower.includes("ainee") || lower.includes("vieux"))
      return "senior";
    if (lower.includes("adulte") || lower.includes("adult")) return "adulte";
    return null;
  }
  if (
    field === "okWithCats" ||
    field === "okWithDogs" ||
    field === "okWithChildren"
  ) {
    if (["oui", "yes", "true", "1"].includes(lower)) return "oui";
    if (["non", "no", "false", "0"].includes(lower)) return "non";
    return "inconnu";
  }
  return v;
}
