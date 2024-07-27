import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@infra/auth/session";
import { db } from "@infra/db";
import { favorites } from "@/server/db/schema";

/**
 * Retourne si un chat donné est dans les favoris de l'utilisateur
 * connecté. Utilisé par le FavoriteButton qui hydrate son état au mount
 * (permet de garder la page détail en SSG + ISR).
 *
 * Non-authentifié : `{ favorite: false }` (200, pas 401 — plus simple pour
 * le client).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ petId: string }> }
) {
  const { petId } = await params;
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ favorite: false, authed: false });
  }

  const [row] = await db
    .select({ petId: favorites.petId })
    .from(favorites)
    .where(
      and(eq(favorites.userId, session.user.id), eq(favorites.petId, petId))
    )
    .limit(1);

  return NextResponse.json({ favorite: !!row, authed: true });
}
