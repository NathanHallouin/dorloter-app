import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";
import { requireAuth } from "@infra/auth/session";
import { VetSignupForm } from "./vet-signup-form";

export const metadata: Metadata = {
  title: "Référencer mon cabinet",
  description:
    "Inscrivez votre cabinet vétérinaire dans l'annuaire Dorloter. SIRET et numéro ONV vérifiés par notre équipe avant publication.",
};

export default async function NewVetPage() {
  const session = await requireAuth();

  if (session.user.role === "veterinarian_admin" && session.user.vetId) {
    redirect("/vet-profil");
  }
  if (session.user.shelterId) redirect("/shelter-profil");
  if (session.user.pensionId) redirect("/pension-profil");

  return (
    <>
      <Navbar />
      <PageContainer className="space-y-6 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Référencer mon cabinet vétérinaire
          </h1>
          <p className="text-sm text-muted-foreground">
            Dorloter référence uniquement les vétérinaires inscrits à
            l&apos;Ordre National. Votre fiche sera publiée dans
            l&apos;annuaire après vérification manuelle du SIRET et du numéro
            ONV par notre équipe (généralement sous 48h).
          </p>
        </header>

        <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 text-sm text-teal-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <div>
            <p className="font-medium">Vérifications réalisées</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-teal-800">
              <li>SIRET cross-checké sur annuaire-entreprises.data.gouv.fr</li>
              <li>
                Numéro ONV cross-checké sur l&apos;
                <Link
                  href="https://annuaire-vet.ordre.veterinaire.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  annuaire officiel
                  <ExternalLink className="inline-block h-3 w-3" />
                </Link>
              </li>
              <li>Correspondance nom + adresse + n° d&apos;inscription</li>
            </ul>
          </div>
        </div>

        <VetSignupForm />
      </PageContainer>
      <Footer />
    </>
  );
}
