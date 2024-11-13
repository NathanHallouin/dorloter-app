import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { FileHeart } from "lucide-react";
import { buttonVariants } from "@shared/ui/button";
import { MyApplicationRow } from "@adoption/public";
import { requireAuth } from "@infra/auth/session";
import {
  getApplicationsByUser,
  getPrimaryPhotosForPets,
} from "@adoption/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Celebrate } from "@/components/celebrate";

export const metadata: Metadata = {
  title: "Mes candidatures",
};

interface PageProps {
  searchParams: Promise<{ new?: string; already?: string }>;
}

export default async function CandidaturesPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const { new: isNew, already } = await searchParams;

  const rows = await getApplicationsByUser(session.user.id);
  const photoMap = await getPrimaryPhotosForPets(rows.map((r) => r.pet.id));

  // Toute candidature acceptée non encore "célébrée" déclenche une pluie
  // de confettis (côté client, via localStorage). Le composant gère lui-
  // même la déduplication par `eventId`.
  const acceptedApplications = rows.filter(
    (r) => r.application.status === "acceptee"
  );

  return (
    <PageContainer variant="wide">
      {acceptedApplications.map(({ application }) => (
        <Celebrate
          key={application.id}
          eventId={`application-accepted-${application.id}`}
        />
      ))}
      <PageHeader
        title="Mes candidatures"
        description={`${rows.length} candidature${rows.length > 1 ? "s" : ""} au total`}
        actions={
          <Link
            href="/adopter"
            className={buttonVariants({ variant: "outline" })}
          >
            Parcourir les chats
          </Link>
        }
      />

      {isNew === "1" && (
        <div className="mb-6 rounded-md bg-teal-50 p-4 text-sm text-teal-800">
          Candidature envoyée. Le refuge revient vers vous, parfois sous deux
          heures, parfois sous deux semaines.
        </div>
      )}
      {already === "1" && (
        <div className="mb-6 rounded-md bg-sable-100 p-4 text-sm text-foreground">
          Vous avez déjà candidaté pour ce chat. Elle est juste en dessous.
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          variant="illustrated"
          icon={<FileHeart className="h-9 w-9" />}
          title="Pas encore de candidature"
          hint="Quand vous postulerez pour un animal, vous suivrez ici l'état de votre dossier · du dépôt à la rencontre."
          action={
            <Link
              href="/adopter"
              className={buttonVariants({ variant: "outline" })}
            >
              Voir les animaux à adopter
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map(({ application, pet }) => (
            <MyApplicationRow
              key={application.id}
              application={application}
              pet={pet}
              catPhotoUrl={photoMap.get(pet.id) ?? null}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
