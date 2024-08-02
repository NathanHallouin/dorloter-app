/**
 * Villes françaises utilisées pour les pages d'atterrissage géolocalisées
 * `/adopter/ville/[slug]`. Contient les 20 plus grandes villes +
 * quelques autres avec de l'activité associative.
 *
 * `prep` (préposition) permet de construire "à Paris" / "au Havre" / "au
 * Mans" sans avoir à gérer les cas particuliers dans le code des pages.
 */
export interface City {
  slug: string;
  name: string;
  prep: "à" | "au" | "aux";
  lat: number;
  lng: number;
  department?: string;
  blurb?: string;
}

export const CITIES: readonly City[] = [
  {
    slug: "paris",
    name: "Paris",
    prep: "à",
    lat: 48.8566,
    lng: 2.3522,
    department: "75",
    blurb:
      "La capitale concentre de nombreuses associations et refuges urbains. Les chats proposés à l'adoption vivent souvent en appartement avant de rejoindre leur famille.",
  },
  {
    slug: "lyon",
    name: "Lyon",
    prep: "à",
    lat: 45.764,
    lng: 4.8357,
    department: "69",
    blurb:
      "La métropole lyonnaise et sa région accueillent plusieurs refuges de qualité, avec un maillage associatif solide dans le Rhône.",
  },
  {
    slug: "marseille",
    name: "Marseille",
    prep: "à",
    lat: 43.2965,
    lng: 5.3698,
    department: "13",
    blurb:
      "Le tissu associatif marseillais s'investit particulièrement pour les colonies de chats errants, en plus des adoptions classiques.",
  },
  {
    slug: "toulouse",
    name: "Toulouse",
    prep: "à",
    lat: 43.6045,
    lng: 1.4442,
    department: "31",
  },
  {
    slug: "nice",
    name: "Nice",
    prep: "à",
    lat: 43.7102,
    lng: 7.262,
    department: "06",
  },
  {
    slug: "nantes",
    name: "Nantes",
    prep: "à",
    lat: 47.2184,
    lng: -1.5536,
    department: "44",
  },
  {
    slug: "strasbourg",
    name: "Strasbourg",
    prep: "à",
    lat: 48.5734,
    lng: 7.7521,
    department: "67",
  },
  {
    slug: "montpellier",
    name: "Montpellier",
    prep: "à",
    lat: 43.6119,
    lng: 3.8772,
    department: "34",
  },
  {
    slug: "bordeaux",
    name: "Bordeaux",
    prep: "à",
    lat: 44.8378,
    lng: -0.5792,
    department: "33",
    blurb:
      "Bordeaux et son agglomération comptent une dizaine de refuges et associations actives, du centre-ville jusqu'à la rive droite.",
  },
  {
    slug: "lille",
    name: "Lille",
    prep: "à",
    lat: 50.6292,
    lng: 3.0573,
    department: "59",
  },
  {
    slug: "rennes",
    name: "Rennes",
    prep: "à",
    lat: 48.1173,
    lng: -1.6778,
    department: "35",
  },
  {
    slug: "reims",
    name: "Reims",
    prep: "à",
    lat: 49.2583,
    lng: 4.0317,
    department: "51",
  },
  {
    slug: "le-havre",
    name: "Le Havre",
    prep: "au",
    lat: 49.4944,
    lng: 0.1079,
    department: "76",
  },
  {
    slug: "saint-etienne",
    name: "Saint-Étienne",
    prep: "à",
    lat: 45.4397,
    lng: 4.3872,
    department: "42",
  },
  {
    slug: "toulon",
    name: "Toulon",
    prep: "à",
    lat: 43.1242,
    lng: 5.928,
    department: "83",
  },
  {
    slug: "grenoble",
    name: "Grenoble",
    prep: "à",
    lat: 45.1885,
    lng: 5.7245,
    department: "38",
  },
  {
    slug: "dijon",
    name: "Dijon",
    prep: "à",
    lat: 47.322,
    lng: 5.0415,
    department: "21",
  },
  {
    slug: "angers",
    name: "Angers",
    prep: "à",
    lat: 47.4784,
    lng: -0.5632,
    department: "49",
  },
  {
    slug: "nimes",
    name: "Nîmes",
    prep: "à",
    lat: 43.8367,
    lng: 4.3601,
    department: "30",
  },
  {
    slug: "villeurbanne",
    name: "Villeurbanne",
    prep: "à",
    lat: 45.7797,
    lng: 4.8822,
    department: "69",
  },
  {
    slug: "clermont-ferrand",
    name: "Clermont-Ferrand",
    prep: "à",
    lat: 45.7797,
    lng: 3.0869,
    department: "63",
  },
  {
    slug: "le-mans",
    name: "Le Mans",
    prep: "au",
    lat: 48.0061,
    lng: 0.1996,
    department: "72",
  },
  {
    slug: "aix-en-provence",
    name: "Aix-en-Provence",
    prep: "à",
    lat: 43.5297,
    lng: 5.4474,
    department: "13",
  },
  {
    slug: "brest",
    name: "Brest",
    prep: "à",
    lat: 48.3904,
    lng: -4.4861,
    department: "29",
  },
  {
    slug: "tours",
    name: "Tours",
    prep: "à",
    lat: 47.3941,
    lng: 0.6848,
    department: "37",
  },
];

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

/**
 * "à Paris", "au Havre", "au Mans", "aux Sables-d'Olonne"…
 */
export function cityInLocative(city: City): string {
  return `${city.prep} ${city.name}`;
}
