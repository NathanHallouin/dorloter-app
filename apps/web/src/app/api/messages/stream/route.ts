import { NextResponse } from "next/server";
import { requireAuth } from "@infra/auth/session";
import { canAccessConversation } from "@messaging/public";
import { messagingBus } from "@messaging/public";

/**
 * Stream SSE pour une conversation.
 *
 * Auth : cookie de session (hérité de la requête HTTP classique).
 * Flush : heartbeat toutes les 30s pour contrer les timeouts proxy/LB.
 * Reconnect : géré nativement par EventSource côté client.
 * Presence : on track l'userId dans le bus pour que les server actions
 * puissent savoir s'il est "en ligne" sur cette conversation et éviter la
 * double notification push.
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
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId requis" },
      { status: 400 }
    );
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Hello : le client confirme la connexion et peut re-sync sa timeline
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"at":"${new Date().toISOString()}"}\n\n`)
      );
      // Retry hint : en cas de déconnexion, le client retente après 3s
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));

      const unsubscribe = messagingBus.subscribe(conversationId, (event) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
            )
          );
        } catch {
          // controller fermé côté client, on laisse tomber
        }
      });

      const releasePresence = messagingBus.trackPresence(
        conversationId,
        session.user.id
      );

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        releasePresence();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
