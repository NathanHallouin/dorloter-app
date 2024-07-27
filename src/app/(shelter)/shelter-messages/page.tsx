import type { Metadata } from "next";
import { requireShelter } from "@infra/auth/session";
import { getInboxForShelter } from "@messaging/public";
import { InboxList } from "@messaging/public";

export const metadata: Metadata = {
  title: "Messages refuge",
};

export const dynamic = "force-dynamic";

export default async function ShelterMessagesPage() {
  const session = await requireShelter();
  const rows = await getInboxForShelter(session.user.shelterId!);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toutes les conversations avec les particuliers (adoptants potentiels,
          signaleurs, etc.).
        </p>
      </header>
      <InboxList basePath="/shelter-messages" rows={rows} />
    </div>
  );
}
