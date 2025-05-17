import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { favoritesApi } from "@dorloter/client";
import { PetCard } from "@/components/PetCard";
import { PageHead, PageBody, EmptyState } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";

export function FavoritesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: () => favoritesApi.mine() });
  const pets = data ?? [];

  return (
    <div>
      <PageHead crumb="Favoris" title="Mes favoris" sub="Les compagnons que vous avez mis de côté." />
      <PageBody>
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && pets.length === 0 ? (
          <EmptyState icon="heart" title="Aucun favori pour l'instant" text="Parcourez le catalogue et gardez vos coups de cœur ici."
            action={<Btn icon="paw" onClick={() => navigate("/adopter")}>Voir le catalogue</Btn>} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(244px,1fr))] gap-[18px]">
            {pets.map((p) => <PetCard key={p.id} pet={p} initialFavorite />)}
          </div>
        )}
      </PageBody>
    </div>
  );
}
