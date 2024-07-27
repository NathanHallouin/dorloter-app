import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import {
  PensionProfileForm,
  getPensionById,
} from "@pensions/public";
import { requirePension } from "@infra/auth/session";

export const metadata: Metadata = {
  title: "Profil de la pension",
};

export default async function PensionProfilPage() {
  const session = await requirePension();
  const pension = await getPensionById(session.user.pensionId);
  if (!pension) notFound();

  return (
    <PageContainer className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pension.name}</h1>
          <p className="text-sm text-muted-foreground">
            Les modifications sont publiées immédiatement sur votre fiche.
          </p>
        </div>
        {pension.isVerified ? (
          <Link
            href={`/pensions/${pension.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Voir la fiche publique
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            En attente de vérification
          </span>
        )}
      </header>

      <PensionProfileForm pension={pension} />
    </PageContainer>
  );
}
