import { NextResponse } from "next/server";
import { requireAuth } from "@infra/auth/session";
import {
  canAccessConversation,
  getMessagesSince,
} from "@messaging/public";

/**
 * Fallback polling pour les clients où SSE ne passe pas (firewall, ad-block
 * agressif). Retourne tous les messages postés depuis `since` (ISO 8601).
 * Le client peut polling toutes les 5s en fallback.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const since = url.searchParams.get("since");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
  }

  const access = await canAccessConversation(
    session.user.id,
    session.user.role,
    session.user.shelterId ?? null,
    conversationId
  );
  if (!access.ok) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const sinceDate = since ? new Date(since) : new Date(0);
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json(
      { error: "since invalide (ISO 8601 attendu)" },
      { status: 400 }
    );
  }

  const messages = await getMessagesSince(conversationId, sinceDate);
  return NextResponse.json({
    messages,
    at: new Date().toISOString(),
  });
}
