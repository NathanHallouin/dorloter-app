import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BellOff, Plus, Search } from "lucide-react";
import { requireAuth } from "@infra/auth/session";
import { getSavedSearchesByUser } from "@identity/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@shared/ui/empty-state";
import { buttonVariants } from "@shared/ui/button";
import { cn } from "@shared/utils";
import { SavedSearchRow } from "./saved-search-row";

export const metadata: Metadata = {
  title: "Mes recherches enregistrées",
};

export default async function SavedSearchesPage() {
  const session = await requireAuth();
  const searches = await getSavedSearchesByUser(session.user.id);

  const active = searches.filter((s) => s.isActive).length;

  return (
    <PageContainer>
      <PageHeader
        title="Mes recherches enregistrées"
        description="Recevez un email dès qu'un nouvel animal correspond à vos critères. Désactivable à tout moment, plafond à 20 recherches par compte."
      />

      {/* CTA création */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/adopter/liste"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto justify-start gap-3 py-4"
          )}
        >
          <Plus className="h-4 w-4 text-coral-500" />
          <span className="flex flex-col items-start">
            <span className="text-sm font-semibold">
              Nouvelle recherche adoption
            </span>
            <span className="text-xs text-muted-foreground">
              Filtrez le catalogue puis enregistrez
            </span>
          </span>
        </Link>
        <Link
          href="/perdus-trouves"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto justify-start gap-3 py-4"
          )}
        >
          <Plus className="h-4 w-4 text-lavande-500" />
          <span className="flex flex-col items-start">
            <span className="text-sm font-semibold">
              Nouvelle veille perdus / trouvés
            </span>
            <span className="text-xs text-muted-foreground">
              Filtrez signalements puis enregistrez
            </span>
          </span>
        </Link>
      </section>

      {searches.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Aucune recherche enregistrée pour le moment"
          hint="Filtrez le catalogue ou les signalements selon vos critères, puis cliquez sur « Enregistrer cette recherche » pour recevoir un email quotidien des nouveautés."
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {searches.length} enregistrée{searches.length > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              {active > 0 ? (
                <Bell className="h-3 w-3 text-coral-500" />
              ) : (
                <BellOff className="h-3 w-3" />
              )}
              {active} active{active > 1 ? "s" : ""}
            </span>
          </div>
          <ul className="space-y-3">
            {searches.map((s) => (
              <SavedSearchRow key={s.id} search={s} />
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  );
}
