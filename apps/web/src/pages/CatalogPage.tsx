import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { petsApi } from "@dorloter/client";
import type { PetFilters } from "@dorloter/client";
import { PetCard } from "@/components/PetCard";
import { Icon } from "@dorloter/ui";
import { Btn, FilterChip } from "@dorloter/ui";

const AGE_LABEL: Record<string, string> = { chaton: "Chaton", jeune: "Jeune", adulte: "Adulte", senior: "Senior" };
const AGES = ["tous", "chaton", "jeune", "adulte", "senior"];

export function CatalogPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [species, setSpecies] = useState<string>(searchParams.get("species") ?? "tous");
  const [age, setAge] = useState<string>("tous");
  const [q, setQ] = useState("");

  const filters: PetFilters = {
    species: species === "tous" ? undefined : species,
    ageCategory: age === "tous" ? undefined : age,
    search: q || undefined,
  };

  const query = useInfiniteQuery({
    queryKey: ["pets", filters],
    queryFn: ({ pageParam }) => petsApi.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.cursor ?? undefined,
  });
  const pets = query.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      {/* en-tête */}
      <div className="border-b border-line bg-card">
        <div className="mx-auto max-w-[1180px] px-8 pt-7">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span>Accueil</span><Icon name="chevron" size={14} /><span className="font-semibold text-coral-600">Adoption</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-[38px] font-semibold tracking-[-0.01em] text-foreground">Animaux à adopter</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {pets.length} compagnon{pets.length > 1 ? "s" : ""} attendent leur famille
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Btn variant="soft" icon="paw" onClick={() => navigate("/adopter/swipe")}>Mode swipe</Btn>
              <Btn variant="soft" icon="sparkles" onClick={() => navigate("/quiz")}>Trouver par quiz</Btn>
              <div className="relative w-[240px]">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="search" size={18} /></span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, race…" className="h-11 w-full rounded-[4px] border border-line bg-background pl-[42px] pr-3.5 text-[14.5px] text-foreground outline-none focus:border-coral-500" />
              </div>
            </div>
          </div>
          <div className="np-scroll flex items-center gap-2 overflow-x-auto py-[18px]">
            <FilterChip active={species === "tous"} onClick={() => setSpecies("tous")}>Tous</FilterChip>
            <FilterChip active={species === "chat"} onClick={() => setSpecies("chat")} icon="cat">Chats</FilterChip>
            <FilterChip active={species === "chien"} onClick={() => setSpecies("chien")} icon="dog">Chiens</FilterChip>
            <span className="mx-1 h-6 w-px flex-none bg-line" />
            {AGES.map((a) => (
              <FilterChip key={a} active={age === a} onClick={() => setAge(a)}>{a === "tous" ? "Tout âge" : AGE_LABEL[a]}</FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* grille */}
      <div className="mx-auto max-w-[1180px] px-8 pb-[60px] pt-[26px]">
        {query.isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {query.isError && <p className="text-brick-600">Impossible de charger le catalogue.</p>}
        {!query.isLoading && pets.length === 0 && (
          <div className="px-5 py-[70px] text-center text-muted-foreground">
            <span className="inline-flex text-sable-300"><Icon name="search" size={46} /></span>
            <p className="mt-3.5 font-semibold text-foreground">Aucun animal ne correspond</p>
            <p className="mt-1 text-[14px]">Élargissez vos critères pour voir plus de compagnons.</p>
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(244px,1fr))] gap-[18px]">
          {pets.map((p) => <PetCard key={p.id} pet={p} />)}
        </div>
        {query.hasNextPage && (
          <div className="mt-7 text-center">
            <Btn variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? "Chargement…" : "Charger plus"}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
