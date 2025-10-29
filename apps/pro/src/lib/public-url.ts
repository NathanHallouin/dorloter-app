/**
 * URL du site public (apps/web · dorloter.fr). L'espace pro vit sur un domaine
 * distinct (pro.dorloter.fr) : les QR codes des fiches cage doivent pointer vers
 * le site public, jamais vers le back-office. En dev : localhost:5173.
 */
export const PUBLIC_WEB_URL =
  import.meta.env.VITE_PUBLIC_WEB_URL ??
  (import.meta.env.DEV ? "http://localhost:5173" : "https://dorloter.fr");

/** URL publique de la fiche d'un animal à adopter. */
export const petPublicUrl = (id: string) => `${PUBLIC_WEB_URL}/adopter/${id}`;
