import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { getUnverifiedPensions, VerifyPensionButton } from "@pensions/public";

export const metadata: Metadata = {
  title: "Pensions à vérifier",
};

export default async function AdminPensionsPage() {
  const pending = await getUnverifiedPensions();

  return (
    <PageContainer className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Pensions à vérifier
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contrôlez le SIRET sur{" "}
          <a
            href="https://annuaire-entreprises.data.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-600 underline"
          >
            annuaire-entreprises.data.gouv.fr
          </a>{" "}
          puis l&apos;agrément auprès de la DDPP du département avant
          publication.
        </p>
      </header>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sable-300 bg-sable-50 p-8 text-center text-sm text-muted-foreground">
          Aucune pension en attente.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((pension) => (
            <article
              key={pension.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sable-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {pension.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  SIRET&nbsp;: <span className="font-mono">{pension.siret}</span>
                  {pension.agrementNumber && (
                    <>
                      {" · "}Agrément&nbsp;:{" "}
                      <span className="font-mono">{pension.agrementNumber}</span>
                    </>
                  )}
                </p>
                {pension.address && (
                  <p className="text-sm text-muted-foreground">{pension.address}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {pension.acceptsCats && "Chats"}
                  {pension.acceptsCats && pension.acceptsDogs && " · "}
                  {pension.acceptsDogs && "Chiens"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/pensions/${pension.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sable-300 bg-white px-3 py-1.5 text-sm text-foreground hover:border-coral-300"
                >
                  Aperçu
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <VerifyPensionButton pensionId={pension.id} />
              </div>
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
