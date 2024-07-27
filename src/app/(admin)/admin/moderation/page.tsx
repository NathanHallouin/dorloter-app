import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getPendingModerationQueue } from "@moderation/public";
import { ModerationRow } from "@moderation/public";

export const metadata: Metadata = {
  title: "Modération · Plateforme",
};

const CONTENT_LABEL = {
  pet: "Chat",
  report: "Signalement",
  shelter: "Refuge",
  user: "Utilisateur",
} as const;

const CONTENT_PATH = {
  pet: "/adopter/",
  report: "/perdus-trouves/",
  shelter: "/refuges/",
  user: "#",
} as const;

export default async function AdminModerationPage() {
  const queue = await getPendingModerationQueue();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          File de modération
        </h1>
        <p className="mt-2 text-muted-foreground">
          Contenus signalés par la communauté. Les chats et signalements
          masqués auto après 5 signalements distincts.
        </p>
      </header>

      {queue.length === 0 ? (
        <EmptyState title="Rien à modérer." hint="Bon signe." />
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <ModerationRow
              key={`${item.contentType}:${item.contentId}`}
              contentType={item.contentType}
              contentId={item.contentId}
              label={item.label}
              contentTypeLabel={CONTENT_LABEL[item.contentType]}
              contentPath={CONTENT_PATH[item.contentType]}
              count={Number(item.count)}
              distinctReporters={Number(item.distinctReporters)}
              latestAt={item.latestAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
