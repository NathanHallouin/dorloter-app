import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import { ShelterProfileForm } from "@shelters/public";
import { AdminsSection } from "@shelters/public";
import {
  getShelterAdmins,
  getPendingInvitations,
} from "@shelters/public";

export const metadata: Metadata = {
  title: "Profil du refuge",
};

export default async function ShelterProfilPage() {
  const session = await requireShelter();

  const [shelter, admins, pending] = await Promise.all([
    db
      .select()
      .from(shelters)
      .where(eq(shelters.id, session.user.shelterId))
      .limit(1)
      .then((r) => r[0]),
    getShelterAdmins(session.user.shelterId),
    getPendingInvitations(session.user.shelterId),
  ]);

  if (!shelter) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          Profil du refuge
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ces informations sont visibles publiquement sur votre page refuge.
        </p>
        {!shelter.isVerified && (
          <div className="mt-3 rounded-md bg-sable-100 px-3 py-2 text-sm text-foreground">
            Votre refuge est en attente de vérification par la plateforme.
          </div>
        )}
      </header>

      <ShelterProfileForm shelter={shelter} />

      <AdminsSection
        admins={admins}
        pending={pending}
        currentUserId={session.user.id}
      />
    </div>
  );
}
