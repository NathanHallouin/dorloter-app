/**
 * GET /api/v1/gifs/search?q=...&limit=20
 *
 * Proxy minimal de l'API Tenor v2 — la clé reste serveur (`TENOR_API_KEY`),
 * le client mobile/web n'a jamais à voir avec.
 *
 * Sans `q` → endpoint `featured` (tendances du moment). Limit par défaut
 * 20, max 50.
 *
 * Rate-limité 60 requêtes/minute/utilisateur. Auth requise (uniquement
 * pour les utilisateurs connectés peuvent partager des GIFs).
 *
 * Si la clé n'est pas configurée côté serveur, on renvoie un 503
 * compréhensible plutôt qu'une erreur opaque.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { unprocessable } from "@infra/api/errors";

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
  duration?: number;
  size?: number;
}

interface TenorGifResult {
  id: string;
  title?: string;
  content_description?: string;
  media_formats: {
    gif?: TenorMediaFormat;
    mediumgif?: TenorMediaFormat;
    tinygif?: TenorMediaFormat;
    nanogif?: TenorMediaFormat;
  };
}

interface TenorResponse {
  results: TenorGifResult[];
  next?: string;
}

export interface GifResultDto {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string | null;
}

const querySchema = z.object({
  q: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const GET = withApi(
  {
    authRequired: true,
    querySchema,
    rateLimit: { key: "api:gifs:search", limit: 60, windowSec: 60 },
  },
  async ({ query, requestId }) => {
    const key = process.env.TENOR_API_KEY;
    if (!key) {
      throw unprocessable(
        "Service GIF non configuré (TENOR_API_KEY manquante côté serveur).",
        { reason: "missing_tenor_key" }
      );
    }

    const limit = query.limit ?? 20;
    const endpoint = query.q
      ? "https://tenor.googleapis.com/v2/search"
      : "https://tenor.googleapis.com/v2/featured";

    const params = new URLSearchParams({
      key,
      client_key: "dorloter",
      country: "FR",
      locale: "fr_FR",
      media_filter: "gif,tinygif",
      contentfilter: "high", // strict (pas de NSFW)
      limit: String(limit),
    });
    if (query.q) params.set("q", query.q);

    const res = await fetch(`${endpoint}?${params.toString()}`, {
      // Cache court : les tendances et les résultats par mot-clef varient lentement.
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      throw unprocessable("Tenor a répondu avec une erreur.", {
        status: res.status,
      });
    }

    const json = (await res.json()) as TenorResponse;
    const items: GifResultDto[] = json.results
      .map((r) => {
        const gif = r.media_formats.gif ?? r.media_formats.mediumgif;
        const preview =
          r.media_formats.tinygif ??
          r.media_formats.nanogif ??
          r.media_formats.gif;
        if (!gif || !preview) return null;
        return {
          id: r.id,
          url: gif.url,
          previewUrl: preview.url,
          width: gif.dims[0],
          height: gif.dims[1],
          title: r.title ?? r.content_description ?? null,
        };
      })
      .filter((x): x is GifResultDto => x !== null);

    return apiOk({ results: items }, { requestId });
  }
);
