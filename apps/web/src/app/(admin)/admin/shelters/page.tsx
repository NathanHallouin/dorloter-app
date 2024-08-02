import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { getUnverifiedShelters } from "@moderation/public";
import { VerifyShelterButton } from "@moderation/public";

export const metadata: Metadata = {
  title: "Vérification refuges · Plateforme",
};

export default async function AdminSheltersPage() {
  const shelters = await getUnverifiedShelters();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Refuges à vérifier
        </h1>
        <p className="mt-2 text-muted-foreground">
          Validez manuellement les refuges avant qu&apos;ils apparaissent avec
          le badge <strong>Vérifié</strong>.
        </p>
      </header>

      {shelters.length === 0 ? (
        <EmptyState title="Tous les refuges sont vérifiés." />
      ) : (
        <ul className="space-y-3">
          {shelters.map((shelter) => (
            <li
              key={shelter.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-lg font-semibold">{shelter.name}</h2>
                    <Link
                      href={`/refuges/${shelter.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-coral-600"
                    >
                      voir la fiche
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  {shelter.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {shelter.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {shelter.siret ? (
                      <span>
                        SIRET : <code className="font-mono">{shelter.siret}</code>
                      </span>
                    ) : (
                      <span className="text-destructive">
                        Pas de SIRET déclaré
                      </span>
                    )}
                    {shelter.email && <span>{shelter.email}</span>}
                    {shelter.phone && <span>{shelter.phone}</span>}
                  </div>
                  {shelter.address && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {shelter.address}
                    </p>
                  )}
                </div>
                <VerifyShelterButton shelterId={shelter.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
