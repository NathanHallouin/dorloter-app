import { load } from "cheerio";
import { randomBytes } from "crypto";
import { uploadFile } from "@infra/storage/s3";

/**
 * Import une annonce depuis une URL PetAlert (ou autre site similaire) et
 * retourne les données extraites prêtes à préfiller le formulaire de
 * signalement. Stratégie défensive, on essaie plusieurs sources dans cet
 * ordre de priorité :
 *   1. JSON-LD (Schema.org) si présent — le plus fiable
 *   2. Open Graph / meta tags
 *   3. Sélecteurs HTML ciblés (spécifiques PetAlert)
 *
 * Les photos trouvées sont téléchargées et ré-uploadées sur notre S3 pour
 * éviter tout hotlink sur les URLs originales (et pour pouvoir les afficher
 * dans le formulaire comme si l'utilisateur les avait uploadées).
 */

export type ImportedReport = {
  sourceUrl: string;
  type: "perdu" | "trouve" | null;
  petName: string | null;
  description: string | null;
  breed: string | null;
  color: string | null;
  sex: "male" | "femelle" | "inconnu" | null;
  distinctiveSigns: string | null;
  address: string | null;
  dateEvent: string | null; // ISO yyyy-mm-dd
  photoUrls: string[]; // URLs publiques S3 après ré-upload
};

const ALLOWED_HOSTS = [
  "petalert.fr",
  "www.petalert.fr",
  "petalert.com",
  "www.petalert.com",
  "pet-alert.fr",
  "www.pet-alert.fr",
];

const USER_AGENT =
  "Mozilla/5.0 (compatible; DorloterBot/1.0; +https://dorloter.fr/bot)";

export function isAllowedSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

export async function fetchPetAlertAnnonce(
  url: string
): Promise<ImportedReport> {
  if (!isAllowedSource(url)) {
    throw new Error(
      "Source non supportée. Seules les URLs PetAlert sont acceptées pour le moment."
    );
  }

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Impossible de récupérer l'annonce (HTTP ${res.status}).`);
  }
  const html = await res.text();
  const $ = load(html);

  // ─── 1. JSON-LD ────────────────────────────────────────────────────────
  const jsonLd = extractJsonLd($);

  // ─── 2. Open Graph ─────────────────────────────────────────────────────
  const og = {
    title: $('meta[property="og:title"]').attr("content") ?? null,
    description: $('meta[property="og:description"]').attr("content") ?? null,
    image: $('meta[property="og:image"]').attr("content") ?? null,
    locality: $('meta[property="og:locality"]').attr("content") ?? null,
  };

  // ─── 3. Sélecteurs HTML ciblés (best-effort, PetAlert DOM évolue) ──────
  const htmlData = {
    title: $("h1").first().text().trim() || null,
    description: findDescription($),
    images: findImages($, url),
    location: findLocation($),
    date: findDate($),
    phone: $('a[href^="tel:"]').first().attr("href")?.replace(/^tel:/, "") ?? null,
  };

  // ─── Fusion : JSON-LD > OG > HTML ──────────────────────────────────────
  const title =
    jsonLd?.name ?? og.title ?? htmlData.title ?? null;
  const description =
    jsonLd?.description ?? og.description ?? htmlData.description ?? null;
  const imageCandidates = dedupe([
    ...(jsonLd?.images ?? []),
    ...(og.image ? [og.image] : []),
    ...htmlData.images,
  ]);

  const type = detectType(title, description, url);
  const petName = type === "perdu" ? extractCatName(title) : null;
  const color = extractColor(title, description);
  const breed = extractBreed(title, description);
  const sex = extractSex(title, description);
  const address =
    jsonLd?.address ?? og.locality ?? htmlData.location ?? null;
  const dateEvent =
    jsonLd?.date ?? htmlData.date ?? null;

  // ─── Téléchargement + ré-upload des photos (max 5) ─────────────────────
  const photoUrls: string[] = [];
  for (const imgUrl of imageCandidates.slice(0, 5)) {
    try {
      const resolved = new URL(imgUrl, url).toString();
      const uploaded = await downloadAndUpload(resolved);
      if (uploaded) photoUrls.push(uploaded);
    } catch {
      // image ratée : on continue sans bloquer
    }
  }

  return {
    sourceUrl: url,
    type,
    petName,
    description,
    breed,
    color,
    sex,
    distinctiveSigns: null,
    address,
    dateEvent,
    photoUrls,
  };
}

// ─── JSON-LD extraction ─────────────────────────────────────────────────────

type JsonLdExtract = {
  name: string | null;
  description: string | null;
  address: string | null;
  date: string | null;
  images: string[];
};

function extractJsonLd($: ReturnType<typeof load>): JsonLdExtract | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const raw = $(scripts[i]).html();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const node = item["@graph"]?.[0] ?? item;
        if (!node || typeof node !== "object") continue;
        // Schema.org LostItem / Thing / Article — on prend ce qu'on trouve
        const images = Array.isArray(node.image)
          ? node.image.filter((u: unknown): u is string => typeof u === "string")
          : typeof node.image === "string"
            ? [node.image]
            : [];
        const addr =
          typeof node.address === "string"
            ? node.address
            : node.address?.addressLocality ??
              node.address?.streetAddress ??
              null;
        return {
          name: typeof node.name === "string" ? node.name : null,
          description:
            typeof node.description === "string" ? node.description : null,
          address: typeof addr === "string" ? addr : null,
          date:
            typeof node.datePublished === "string"
              ? node.datePublished.slice(0, 10)
              : typeof node.dateCreated === "string"
                ? node.dateCreated.slice(0, 10)
                : null,
          images,
        };
      }
    } catch {
      // JSON-LD malformé, on ignore
    }
  }
  return null;
}

// ─── HTML fallback helpers ─────────────────────────────────────────────────

function findDescription($: ReturnType<typeof load>): string | null {
  // PetAlert : souvent dans un <div class="description"> ou <article>
  const candidates = [
    ".description",
    ".annonce-description",
    ".content",
    "article",
    '[class*="description"]',
  ];
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text.length > 50) return text.slice(0, 2000);
    }
  }
  // Fallback : la description sous le titre
  const afterH1 = $("h1").first().nextAll("p, div").first().text().trim();
  return afterH1 ? afterH1.slice(0, 2000) : null;
}

function findImages(
  $: ReturnType<typeof load>,
  baseUrl: string
): string[] {
  const images: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    if (!src) return;
    // Filtre : on veut des photos substantielles, pas des icônes
    try {
      const resolved = new URL(src, baseUrl).toString();
      if (/\.(jpe?g|png|webp)(\?|$)/i.test(resolved)) {
        images.push(resolved);
      }
    } catch {
      /* ignore */
    }
  });
  return dedupe(images);
}

function findLocation($: ReturnType<typeof load>): string | null {
  const candidates = [
    '[class*="location"]',
    '[class*="address"]',
    '[class*="ville"]',
    '[class*="adresse"]',
  ];
  for (const sel of candidates) {
    const text = $(sel).first().text().trim();
    if (text && text.length < 200) return text;
  }
  return null;
}

function findDate($: ReturnType<typeof load>): string | null {
  // Meta tags avec dates
  const metaDate =
    $('meta[property="article:published_time"]').attr("content") ??
    $('meta[name="date"]').attr("content") ??
    $("time[datetime]").first().attr("datetime");
  if (metaDate) {
    const match = metaDate.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  return null;
}

// ─── Heuristiques de parsing libre ─────────────────────────────────────────

function detectType(
  title: string | null,
  description: string | null,
  url: string
): "perdu" | "trouve" | null {
  const haystack = `${url} ${title ?? ""} ${description ?? ""}`.toLowerCase();
  if (/(perdu|disparu|recherche|lost)/.test(haystack)) return "perdu";
  if (/(trouv[ée]|found|recueilli|r[éeè]cup[éeè]r[éeè])/.test(haystack))
    return "trouve";
  return null;
}

function extractCatName(title: string | null): string | null {
  if (!title) return null;
  // Pattern : "Animal perdu : Mistigri - Paris 10e" ou "Mistigri, animal perdu..."
  const m =
    title.match(/(?:chat\s+(?:perdu|disparu)\s*[:\-–]\s*)([A-ZÀ-Ü][\wÀ-ÿ'-]{1,30})/i) ??
    title.match(/^([A-ZÀ-Ü][\wÀ-ÿ'-]{1,30})\s*[,\-–]/);
  return m?.[1] ?? null;
}

const COLOR_WORDS = [
  "noir",
  "blanc",
  "gris",
  "roux",
  "tigré",
  "tricolore",
  "écaille",
  "beige",
  "crème",
  "marron",
  "chocolat",
  "bleu",
  "sable",
];

function extractColor(
  title: string | null,
  description: string | null
): string | null {
  const haystack = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  const found = COLOR_WORDS.filter((c) =>
    new RegExp(`\\b${c}\\b`).test(haystack)
  );
  return found.length > 0 ? found.slice(0, 3).join(" et ") : null;
}

const BREED_WORDS = [
  "européen",
  "siamois",
  "persan",
  "maine coon",
  "chartreux",
  "bengal",
  "british",
  "sphynx",
  "sacré de birmanie",
  "ragdoll",
  "angora",
];

function extractBreed(
  title: string | null,
  description: string | null
): string | null {
  const haystack = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  for (const b of BREED_WORDS) {
    if (new RegExp(`\\b${b}\\b`, "i").test(haystack)) {
      return b.charAt(0).toUpperCase() + b.slice(1);
    }
  }
  return null;
}

function extractSex(
  title: string | null,
  description: string | null
): "male" | "femelle" | "inconnu" | null {
  const haystack = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  // On cherche des formulations explicites — éviter les faux positifs
  if (/\b(femelle|chatte|elle est)\b/.test(haystack)) return "femelle";
  if (/\b(m[aâ]le|matou|il est)\b/.test(haystack)) return "male";
  return null;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ─── Téléchargement + ré-upload S3 ─────────────────────────────────────────

async function downloadAndUpload(imageUrl: string): Promise<string | null> {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  // Rejet si plus de 8 Mo (évite abus)
  if (buffer.byteLength > 8 * 1024 * 1024) return null;

  const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
  const key = `reports/imported/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  return uploadFile(key, buffer, contentType);
}
