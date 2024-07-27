import { NextResponse } from "next/server";

/**
 * Valide le token d'un appel cron. Retourne `null` si OK, ou une
 * `NextResponse` 401 à renvoyer tel quel sinon.
 *
 * Sans `CRON_SECRET` défini dans l'env : endpoint ouvert (dev local
 * uniquement — ne JAMAIS déployer en prod sans cette variable).
 *
 * Accepte le token via `?token=xxx` ou header `Authorization: Bearer xxx`.
 */
export function checkCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;

  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (token !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}
