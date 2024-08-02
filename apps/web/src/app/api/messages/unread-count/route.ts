import { NextResponse } from "next/server";
import { requireAuth } from "@infra/auth/session";
import { getUnreadCounts } from "@messaging/public";

/**
 * Compteur global des messages non lus pour l'utilisateur courant.
 * Hit par la navbar toutes les 60s.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return NextResponse.json({ asUser: 0, asShelter: 0 });
  }

  const counts = await getUnreadCounts(
    session.user.id,
    session.user.shelterId ?? null
  );

  return NextResponse.json({
    ...counts,
    total: counts.asUser + counts.asShelter,
  });
}
