import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Radio } from "lucide-react";
import { buttonVariants } from "@shared/ui/button";
import { MyReportRow } from "@lost-found/public";
import { requireAuth } from "@infra/auth/session";
import {
  getReportsByUser,
  getPrimaryPhotosForReports,
} from "@lost-found/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Mes signalements",
};

export default async function MesSignalementsPage() {
  const session = await requireAuth();
  const reports = await getReportsByUser(session.user.id);
  const photoMap = await getPrimaryPhotosForReports(reports.map((r) => r.id));

  return (
    <PageContainer variant="stream">
      <PageHeader
        title="Mes signalements"
        description={`${reports.length} signalement${reports.length > 1 ? "s" : ""} au total`}
        actions={
          <Link href="/signaler" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau
          </Link>
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          variant="illustrated"
          icon={<Radio className="h-9 w-9" />}
          title="Aucun signalement pour le moment"
          hint="Tant mieux — pas de panique à signaler. Si un jour vous perdez ou trouvez un animal, c'est par ici."
          action={
            <Link
              href="/signaler"
              className={buttonVariants({ variant: "outline" })}
            >
              Déposer un signalement
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <MyReportRow
              key={report.id}
              report={report}
              primaryPhoto={photoMap.get(report.id) ?? null}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
