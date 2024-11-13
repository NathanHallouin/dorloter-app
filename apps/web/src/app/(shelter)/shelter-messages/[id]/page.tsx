import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import {
  canAccessConversation,
  getConversationContext,
  getMessagesForConversation,
} from "@messaging/public";
import { ConversationThread } from "@messaging/public";

export const metadata: Metadata = {
  title: "Conversation",
};

export const dynamic = "force-dynamic";

export default async function ShelterMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireShelter();

  const access = await canAccessConversation(
    session.user.id,
    session.user.role,
    session.user.shelterId ?? null,
    id
  );
  if (!access.ok || access.asSide !== "shelter") notFound();

  const [ctx, messages] = await Promise.all([
    getConversationContext(id),
    getMessagesForConversation(id),
  ]);
  if (!ctx) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <Link
        href="/shelter-messages"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour à l&apos;inbox
      </Link>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Particulier
            </p>
            <span className="text-lg font-semibold text-foreground">
              {ctx.userName}
            </span>
          </div>
          {ctx.petId && ctx.petName && (
            <Link
              href={`/adopter/${ctx.petId}`}
              className="inline-flex items-center gap-1 rounded-full bg-lavande-50 px-3 py-1 text-xs font-medium text-lavande-700 hover:bg-lavande-100"
            >
              À propos de {ctx.petName}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      <ConversationThread
        conversationId={id}
        currentUserId={session.user.id}
        side="shelter"
        initialMessages={messages}
        peerName={ctx.userName}
        peerUserId={ctx.userId}
      />
    </div>
  );
}
