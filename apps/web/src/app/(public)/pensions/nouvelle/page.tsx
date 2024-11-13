import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";
import { PensionProfileForm } from "@pensions/public";
import { requireAuth } from "@infra/auth/session";

export const metadata: Metadata = {
  title: "Référencer ma pension",
};

export default async function NewPensionPage() {
  const session = await requireAuth();

  if (session.user.role === "pension_admin" && session.user.pensionId) {
    redirect("/pension-profil");
  }
  if (session.user.shelterId) {
    redirect("/shelter-profil");
  }

  return (
    <>
      <Navbar />
      <PageContainer className="space-y-6 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Référencer ma pension
          </h1>
          <p className="text-sm text-muted-foreground">
            Dorloter ne référence que les pensions professionnelles agréées.
            Votre fiche sera publiée dans l&apos;annuaire une fois le SIRET et
            l&apos;agrément vérifiés manuellement par notre équipe.
          </p>
        </header>
        <PensionProfileForm />
      </PageContainer>
      <Footer />
    </>
  );
}
