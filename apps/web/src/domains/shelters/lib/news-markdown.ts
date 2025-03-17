/**
 * Mini-renderer Markdown → HTML pour les actualités refuge.
 *
 * Pas de dépendance externe : on couvre uniquement le sous-ensemble
 * autorisé (titres h2/h3, paragraphes, gras, italique, liens externes,
 * listes à puces et numérotées, retours à la ligne). Tout autre input
 * est échappé, pas de balises HTML brutes acceptées dans la source.
 *
 * Les liens externes sortent en `rel="nofollow noopener"` et
 * `target="_blank"`. Pas d'images inline (les refuges utilisent le
 * coverUrl du post).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // Liens [texte](url) — uniquement http(s) ou mailto
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="nofollow noopener">${label}</a>`
  );
  // Gras **x**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italique *x* (sans coller à un mot)
  out = out.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>");
  return out;
}

export function renderNewsMarkdown(source: string): string {
  if (!source) return "";
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    if (raw === undefined) {
      i++;
      continue;
    }
    const line = raw.trimEnd();

    if (line === "") {
      i++;
      continue;
    }

    // Titres
    if (line.startsWith("### ")) {
      out.push(`<h3>${renderInline(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${renderInline(line.slice(3))}</h2>`);
      i++;
      continue;
    }

    // Liste à puces
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = (lines[i] ?? "").trimEnd();
        if (!/^[-*]\s+/.test(l)) break;
        items.push(`<li>${renderInline(l.replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Liste numérotée
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = (lines[i] ?? "").trimEnd();
        if (!/^\d+\.\s+/.test(l)) break;
        items.push(`<li>${renderInline(l.replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraphe (concatène lignes consécutives non vides)
    const para: string[] = [line];
    i++;
    while (i < lines.length) {
      const l = (lines[i] ?? "").trimEnd();
      if (
        l === "" ||
        l.startsWith("## ") ||
        l.startsWith("### ") ||
        /^[-*]\s+/.test(l) ||
        /^\d+\.\s+/.test(l)
      )
        break;
      para.push(l);
      i++;
    }
    out.push(`<p>${renderInline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

/**
 * Génère un slug URL friendly à partir d'un titre. Accentué -> ASCII,
 * espaces -> tirets, longueur max 80.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Extrait un résumé court d'un texte markdown : première
 * phrase / premier paragraphe, max ~200 caractères, sans balises.
 */
export function extractExcerpt(source: string, max = 200): string {
  const flat = source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter(Boolean)
    .find((l) => !l.startsWith("#"));
  if (!flat) return "";
  const plain = flat
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_]/g, "")
    .trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
