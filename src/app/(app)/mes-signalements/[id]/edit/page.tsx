import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { reportPhotos } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { ReportEditForm } from "@lost-found/public";
import { getReportById } from "@lost-found/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { sql } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Compléter le signalement",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditReportPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth();

  const report = await getReportById(id);
  if (!report) notFound();
  if (report.userId !== session.user.id) {
    redirect("/mes-signalements");
  }
  if (report.status !== "actif") {
    // Pas d'édition sur un signalement résolu/expiré — on renvoie sur la
    // fiche publique.
    redirect(`/perdus-trouves/${id}`);
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reportPhotos)
    .where(eq(reportPhotos.reportId, id));

  return (
    <PageContainer variant="stream">
      <Link
        href={`/perdus-trouves/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour à la fiche
      </Link>
      <PageHeader
        title="Compléter le signalement"
        description="Plus la fiche est précise, plus le système peut faire le lien avec une annonce en face. Le type, la date et le lieu ne sont pas modifiables — supprimez et recréez si besoin."
      />
      <ReportEditForm
        reportId={report.id}
        type={report.type}
        species={report.species}
        initialPetName={report.petName}
        initialDescription={report.description}
        initialColor={report.color}
        initialBreed={report.breed}
        initialSex={report.sex}
        initialDistinctiveSigns={report.distinctiveSigns}
        initialIsChipped={report.isChipped}
        initialChipNumber={report.chipNumber}
        initialAddress={report.address}
        initialContactPhone={report.contactPhone}
        initialContactEmail={report.contactEmail}
        initialNotes={report.notes}
        existingPhotosCount={Number(countRow?.count ?? 0)}
      />
    </PageContainer>
  );
}
