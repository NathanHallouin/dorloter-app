import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { ShelterApplicationRow } from "@adoption/public";
import { requireShelter } from "@infra/auth/session";
import {
  getApplicationsForShelter,
  getPrimaryPhotosForPets,
} from "@adoption/public";

export const metadata: Metadata = {
  title: "Candidatures reçues · Refuge",
};

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

const FILTER_LABELS: Record<string, string> = {
  all: "Toutes",
  pending: "À traiter",
  accepted: "Acceptées",
  refused: "Refusées",
};

export default async function ShelterCandidaturesPage({
  searchParams,
}: PageProps) {
  const session = await requireShelter();
  const { filter = "all" } = await searchParams;

  const all = await getApplicationsForShelter(session.user.shelterId);

  const filtered = all.filter((row) => {
    const s = row.application.status;
    if (filter === "pending") return s === "envoyee" || s === "en_cours";
    if (filter === "accepted") return s === "acceptee";
    if (filter === "refused") return s === "refusee" || s === "annulee";
    return true;
  });

  const photoMap = await getPrimaryPhotosForPets(
    filtered.map((r) => r.pet.id)
  );

  const counts = {
    all: all.length,
    pending: all.filter(
      (r) => r.application.status === "envoyee" || r.application.status === "en_cours"
    ).length,
    accepted: all.filter((r) => r.application.status === "acceptee").length,
    refused: all.filter(
      (r) => r.application.status === "refusee" || r.application.status === "annulee"
    ).length,
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Candidatures reçues
        </h1>
        <p className="mt-2 text-muted-foreground">
          {counts.pending} en attente de traitement · {counts.all} au total
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "pending", "accepted", "refused"] as const).map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/shelter-candidatures" : `/shelter-candidatures?filter=${k}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === k
                ? "bg-coral-500 text-white"
                : "border border-border bg-card hover:border-coral-300"
            }`}
          >
            {FILTER_LABELS[k]} ({counts[k]})
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune candidature dans cette catégorie." />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ application, pet, applicant }) => (
            <ShelterApplicationRow
              key={application.id}
              application={application}
              pet={pet}
              applicant={applicant}
              catPhotoUrl={photoMap.get(pet.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
