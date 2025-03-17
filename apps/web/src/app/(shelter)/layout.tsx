import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import {
  countPendingInboundTransfers,
  getShelterStats,
} from "@adoption/public";
import { countPendingFosterCandidaturesForShelter } from "@shelters/public";
import { getShelterUnreadCount } from "@messaging/public";
import { ShelterHeader } from "./_components/shelter-header";
import { ShelterSidebar } from "./_components/shelter-sidebar";

export default async function ShelterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireShelter();
  const shelterId = session.user.shelterId;

  const [
    shelter,
    stats,
    unreadMessages,
    pendingTransfers,
    pendingFosterCandidatures,
  ] = await Promise.all([
    db
      .select({
        id: shelters.id,
        name: shelters.name,
        isVerified: shelters.isVerified,
      })
      .from(shelters)
      .where(eq(shelters.id, shelterId))
      .then((r) => r[0]),
    getShelterStats(shelterId),
    getShelterUnreadCount(shelterId),
    countPendingInboundTransfers(shelterId),
    countPendingFosterCandidaturesForShelter(shelterId),
  ]);

  if (!shelter) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-sable-50/40">
      <ShelterHeader
        user={session.user}
        shelterName={shelter.name}
        shelterVerified={shelter.isVerified}
      />
      <div className="flex w-full flex-1 flex-col gap-8 px-4 py-8 md:flex-row md:px-6 lg:px-8">
        <ShelterSidebar
          counts={{
            applicationsPending: stats.applicationsPending,
            unreadMessages,
            pendingTransfers,
            pendingFosterCandidatures,
          }}
        />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
