import type { Metadata } from "next";
import { ReportForm } from "@lost-found/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Signaler un animal",
};

export default function SignalerPage() {
  return (
    <PageContainer variant="narrow">
      <PageHeader
        title="Un signalement"
        description="Prenez deux minutes : plus les détails sont précis, plus vite on peut faire le lien avec une annonce en face."
      />
      <ReportForm />
    </PageContainer>
  );
}
