import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AlertCircle, MapPin, Search, ShieldCheck } from "lucide-react";
import { requireVeterinarian } from "@infra/auth/session";
import { getVeterinarianById } from "@veterinarians/public";
import { getReports, getPrimaryPhotosForReports } from "@lost-found/public";
import { Input } from "@shared/ui/input";
import { Badge } from "@shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { EmptyState } from "@shared/ui/empty-state";
import { placeholderPets } from "@shared/utils/placeholder-images";

const fallbackPhotos = Object.values(placeholderPets);

export const metadata: Metadata = {
  title: "Recherche de signalements · Vétérinaire",
};

type TypeFilter = "all" | "perdu" | "trouve";
type SpeciesFilter = "all" | "chat" | "chien";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    species?: string;
    q?: string;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  perdu: "Perdu",
  trouve: "Trouvé",
};

export default async function VetReportsSearchPage({ searchParams }: PageProps) {
  const session = await requireVeterinarian();
  const vet = await getVeterinarianById(session.user.vetId);
  if (!vet) redirect("/dashboard");

  const params = await searchParams;
  const typeFilter = (params.type ?? "all") as TypeFilter;
  const speciesFilter = (params.species ?? "all") as SpeciesFilter;
  const search = (params.q ?? "").trim().toLowerCase();

  // Si le cabinet n'a pas de coordonnées, on ne peut pas appliquer le filtre
  // géo. On affiche un message demandant de compléter l'adresse.
  if (!vet.location) {
    return (
      <div className="space-y-6">
        <PageHeader vet={vet} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-medium text-amber-900">
                Coordonnées GPS du cabinet manquantes
              </p>
              <p className="mt-1 text-sm text-amber-800">
                La recherche se base sur un rayon géographique autour de votre
                cabinet. Renseignez l&apos;adresse complète dans votre profil
                pour activer cette fonction.
              </p>
              <Link
                href="/vet-profil"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
              >
                Compléter le profil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const reports = await getReports({
    type: typeFilter === "all" ? undefined : typeFilter,
    centerLat: vet.location.y,
    centerLng: vet.location.x,
    radiusKm: vet.searchRadiusKm,
  });

  // Filtrage côté JS pour le critère espèce + recherche libre (pas de filtre
  // DB existant, et on est sur 50 résultats max — acceptable).
  const filtered = reports.filter((r) => {
    if (speciesFilter !== "all" && r.species !== speciesFilter) return false;
    if (search) {
      const hay = `${r.petName ?? ""} ${r.color ?? ""} ${r.breed ?? ""} ${r.description ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const photoMap = await getPrimaryPhotosForReports(filtered.map((r) => r.id));

  return (
    <div className="space-y-6">
      <PageHeader vet={vet} />

      {/* Filtres */}
      <form
        method="get"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Nom, couleur, race, description…"
            className="pl-8"
          />
        </div>
        <Select name="type" defaultValue={typeFilter}>
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="perdu">Perdus</SelectItem>
            <SelectItem value="trouve">Trouvés</SelectItem>
          </SelectContent>
        </Select>
        <Select name="species" defaultValue={speciesFilter}>
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="Espèce" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes espèces</SelectItem>
            <SelectItem value="chat">Chats</SelectItem>
            <SelectItem value="chien">Chiens</SelectItem>
          </SelectContent>
        </Select>
        {(search || typeFilter !== "all" || speciesFilter !== "all") && (
          <Link
            href="/vet-recherche-signalements"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Réinitialiser
          </Link>
        )}
        <button type="submit" className="sr-only">
          Filtrer
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""} dans un
          rayon de {vet.searchRadiusKm} km
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun signalement ne correspond."
          hint="Essayez d'élargir les filtres ou d'augmenter le rayon dans votre profil."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const photo = photoMap.get(r.id);
            return (
              <Link
                key={r.id}
                href={`/perdus-trouves/${r.id}`}
                target="_blank"
                className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-teal-300"
              >
                <div className="relative h-40 w-full bg-muted">
                  <Image
                    src={
                      photo?.url ||
                      fallbackPhotos[
                        (r.petName ?? "X").charCodeAt(0) % fallbackPhotos.length
                      ]!
                    }
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                  <Badge
                    className={`absolute left-2 top-2 ${
                      r.type === "perdu"
                        ? "bg-coral-500 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {TYPE_LABELS[r.type] ?? r.type}
                  </Badge>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-foreground">
                    {r.petName ?? "Sans nom"}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {r.species === "chat" ? "Chat" : "Chien"}
                    </span>
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {[r.breed, r.color, r.sex && r.sex !== "inconnu" && r.sex]
                      .filter(Boolean)
                      .join(" · ") || r.description || "Aucune description"}
                  </p>
                  {r.address && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{r.address}</span>
                    </p>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.type === "perdu" ? "Perdu" : "Trouvé"} le{" "}
                    {new Date(r.dateEvent).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageHeader({
  vet,
}: {
  vet: { searchRadiusKm: number; address: string | null };
}) {
  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Recherche
        </p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">
          Signalements proches
        </h1>
        <p className="mt-2 text-muted-foreground">
          Signalements actifs dans un rayon de{" "}
          <strong>{vet.searchRadiusKm} km</strong> autour de votre cabinet
          {vet.address ? ` (${vet.address.split(",").pop()?.trim()})` : ""}.
        </p>
      </header>
      <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-sm text-teal-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
        <p>
          Chaque consultation et révélation de coordonnées est tracée pour
          conformité RGPD. Utilisez cette base uniquement si vous avez un
          animal correspondant en consultation.
        </p>
      </div>
    </>
  );
}
