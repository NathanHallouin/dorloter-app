import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@infra/db";
import { petPhotos } from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { AlertCircle, Inbox, Plus, Search } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import {
  getPetsByShelter,
  getPendingApplicationsCountForPets,
} from "@adoption/public";
import { Badge } from "@shared/ui/badge";
import { buttonVariants } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { EmptyState } from "@shared/ui/empty-state";
import { placeholderPets } from "@shared/utils/placeholder-images";

const fallbackPhotos = Object.values(placeholderPets);

export const metadata: Metadata = {
  title: "Mes animaux · Refuge",
};

type StatusFilter = "all" | "disponible" | "reserve" | "adopte" | "retire";

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  adopte: "Adopté",
  retire: "Retiré",
};

const STATUS_BADGE: Record<string, string> = {
  disponible: "bg-green-100 text-green-800",
  reserve: "bg-lavande-100 text-lavande-800",
  adopte: "bg-coral-100 text-coral-800",
  retire: "bg-sable-100 text-sable-800",
};

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "disponible", label: "Disponibles" },
  { value: "reserve", label: "Réservés" },
  { value: "adopte", label: "Adoptés" },
  { value: "retire", label: "Retirés" },
];

export default async function ShelterCatsPage({ searchParams }: PageProps) {
  const session = await requireShelter();
  const params = await searchParams;
  const status = (params.status ?? "all") as StatusFilter;
  const search = (params.q ?? "").trim();

  const allPets = await getPetsByShelter(session.user.shelterId);

  const photoMap = await getPetPrimaryPhotos(allPets.map((p) => p.id));
  const applicationsMap = await getPendingApplicationsCountForPets(
    allPets.map((p) => p.id)
  );

  // Compteurs par statut (toujours sur l'ensemble, pas sur le filtre)
  const counts: Record<StatusFilter, number> = {
    all: allPets.length,
    disponible: 0,
    reserve: 0,
    adopte: 0,
    retire: 0,
  };
  for (const p of allPets) {
    if (p.status in counts) counts[p.status as StatusFilter] += 1;
  }

  // Filtrage actif
  const searchLower = search.toLowerCase();
  const filtered = allPets.filter((pet) => {
    if (status !== "all" && pet.status !== status) return false;
    if (searchLower) {
      const hay = `${pet.name} ${pet.breed ?? ""}`.toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mes animaux</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.all > 0
              ? `${counts.all} animal${counts.all > 1 ? "x" : ""} sur la plateforme`
              : "Aucun animal publié pour le moment."}
          </p>
        </div>
        <Link
          href="/shelter-animaux/new"
          className={buttonVariants({ size: "default" })}
        >
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un animal
        </Link>
      </header>

      {allPets.length > 0 && (
        <form
          method="get"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={search}
              placeholder="Nom, race…"
              className="pl-8"
            />
          </div>
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          {(search || status !== "all") && (
            <Link
              href="/shelter-animaux"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Réinitialiser
            </Link>
          )}
          <button type="submit" className="sr-only">
            Filtrer
          </button>
        </form>
      )}

      {/* Tabs statut */}
      {allPets.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const active = status === tab.value;
            const c = counts[tab.value];
            const params = new URLSearchParams();
            if (search) params.set("q", search);
            if (tab.value !== "all") params.set("status", tab.value);
            const qs = params.toString();
            const href = qs ? `/shelter-animaux?${qs}` : "/shelter-animaux";
            return (
              <Link
                key={tab.value}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-coral-500 text-white"
                    : "border border-border bg-card text-foreground hover:border-coral-300"
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-sable-100 text-muted-foreground"
                  }`}
                >
                  {c}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Résultats */}
      {allPets.length === 0 ? (
        <EmptyState
          variant="illustrated"
          title="Aucun animal pour l'instant."
          hint="Publiez votre première fiche pour qu'un animal apparaisse dans le catalogue d'adoption."
          action={
            <Link
              href="/shelter-animaux/new"
              className={buttonVariants({ size: "default" })}
            >
              <Plus className="mr-1 h-4 w-4" />
              Ajouter mon premier animal
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun résultat avec ces critères."
          hint="Essayez d'élargir la recherche ou de changer d'onglet."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((pet) => {
            const photo = photoMap.get(pet.id);
            const pendingApps = applicationsMap.get(pet.id) ?? 0;
            const incomplete = isIncomplete(pet, photo);
            return (
              <Link
                key={pet.id}
                href={`/shelter-animaux/${pet.id}/edit`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-coral-300 hover:bg-sable-50/50"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={
                      photo ||
                      fallbackPhotos[
                        pet.name.charCodeAt(0) % fallbackPhotos.length
                      ]!
                    }
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{pet.name}</h3>
                    {incomplete && (
                      <span
                        title="Fiche incomplète : ajoutez une photo ou une description."
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                      >
                        <AlertCircle className="h-3 w-3" />
                        À compléter
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pet.species === "chat" ? "Chat" : "Chien"}
                    {pet.breed ? ` · ${pet.breed}` : ""} ·{" "}
                    {pet.sex === "male"
                      ? "Mâle"
                      : pet.sex === "femelle"
                        ? "Femelle"
                        : "Sexe inconnu"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {pendingApps > 0 && (
                    <span
                      title={`${pendingApps} candidature${pendingApps > 1 ? "s" : ""} en attente`}
                      className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2 py-0.5 text-xs font-semibold text-coral-700"
                    >
                      <Inbox className="h-3 w-3" />
                      {pendingApps}
                    </span>
                  )}
                  <Badge className={STATUS_BADGE[pet.status] ?? ""}>
                    {STATUS_LABELS[pet.status] ?? pet.status}
                  </Badge>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    Modifier →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function getPetPrimaryPhotos(petIds: string[]) {
  if (petIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ petId: petPhotos.petId, url: petPhotos.url })
    .from(petPhotos)
    .where(and(inArray(petPhotos.petId, petIds), eq(petPhotos.isPrimary, true)));
  return new Map(rows.map((r) => [r.petId, r.url]));
}

function isIncomplete(
  pet: { description: string | null },
  primaryPhoto: string | undefined
): boolean {
  return !primaryPhoto || !pet.description || pet.description.trim().length < 30;
}
