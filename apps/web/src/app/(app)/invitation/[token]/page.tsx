import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterInvitations, shelters } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { AcceptInvitation } from "@shelters/public";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Invitation refuge",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  const session = await requireAuth();

  const [row] = await db
    .select({
      invitation: shelterInvitations,
      shelterName: shelters.name,
    })
    .from(shelterInvitations)
    .innerJoin(shelters, eq(shelters.id, shelterInvitations.shelterId))
    .where(eq(shelterInvitations.token, token))
    .limit(1);

  if (!row) {
    return (
      <PageContainer variant="narrow" className="py-16 text-center">
        <h1 className="text-2xl font-bold">Invitation introuvable</h1>
        <p className="mt-2 text-muted-foreground">
          Le lien est peut-être cassé ou l&apos;invitation a été révoquée.
        </p>
      </PageContainer>
    );
  }

  const { invitation, shelterName } = row;

  if (invitation.status === "acceptee") {
    // Déjà acceptée : rediriger vers l'espace refuge
    redirect("/shelter-animaux");
  }

  const isExpired = invitation.expiresAt.getTime() < Date.now();
  const wrongEmail =
    invitation.email.toLowerCase() !== session.user.email.toLowerCase();

  return (
    <PageContainer variant="narrow" className="py-12">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">Rejoindre « {shelterName} »</h1>
        <p className="mt-2 text-muted-foreground">
          Vous avez été invité·e à gérer ce refuge sur Dorloter. En acceptant,
          vous pourrez publier des chats, traiter les candidatures et éditer
          le profil du refuge.
        </p>

        {isExpired && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Cette invitation a expiré. Demandez à l&apos;équipe du refuge
            d&apos;en envoyer une nouvelle.
          </div>
        )}

        {wrongEmail && !isExpired && (
          <div className="mt-4 rounded-md bg-sable-100 p-3 text-sm text-foreground">
            L&apos;invitation a été envoyée à{" "}
            <strong>{invitation.email}</strong>. Vous êtes connecté·e avec{" "}
            <strong>{session.user.email}</strong>. Déconnectez-vous puis
            reconnectez-vous avec la bonne adresse.
          </div>
        )}

        {!isExpired && !wrongEmail && (
          <AcceptInvitation token={token} />
        )}
      </div>
    </PageContainer>
  );
}
