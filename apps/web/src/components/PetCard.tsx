import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@dorloter/client";
import { favoritesApi } from "@dorloter/client";
import { Icon } from "@dorloter/ui";
import { Pill, FavoriteButton, CompatPills } from "@dorloter/ui";
import type { PetSummary } from "@dorloter/client";

const AGE_LABEL: Record<string, string> = { chaton: "Chaton", jeune: "Jeune", adulte: "Adulte", senior: "Senior" };

export function PetCard({ pet, initialFavorite = false }: { pet: PetSummary; initialFavorite?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fav, setFav] = useState(initialFavorite);

  const toggleFav = () => {
    if (!user) { navigate("/login"); return; }
    if (fav) favoritesApi.remove(pet.id).then(() => setFav(false)).catch(() => {});
    else favoritesApi.add(pet.id).then(() => setFav(true)).catch(() => {});
  };

  return (
    <Link
      to={`/adopter/${pet.id}`}
      className="group block overflow-hidden rounded-[4px] border border-line bg-card transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-[3px] hover:border-coral-400 hover:shadow-[0_16px_30px_rgba(20,16,8,.10)]"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {pet.primaryPhoto ? (
          <img src={pet.primaryPhoto.url} alt={pet.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[56px] text-sable-300">{pet.species === "chat" ? "🐱" : "🐶"}</div>
        )}
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <Pill tone="white" icon={pet.species === "chat" ? "cat" : "dog"}>{pet.species}</Pill>
          {pet.ageCategory === "senior" && <Pill tone="lavande">Senior</Pill>}
        </div>
        <div className="absolute right-2.5 top-2.5">
          <FavoriteButton active={fav} onToggle={toggleFav} />
        </div>
      </div>
      <div className="px-[15px] pb-[15px] pt-[13px]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[21px] font-semibold tracking-[-0.01em] text-foreground">{pet.name}</h3>
          <span className={cnSex(pet.sex)}><Icon name={pet.sex === "femelle" ? "venus" : "mars"} size={16} /></span>
        </div>
        <p className="mono mt-[3px] text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          {(pet.ageCategory ? AGE_LABEL[pet.ageCategory] : "Âge ?")} · {pet.breed ?? "Croisé"}
        </p>
        <div className="mt-[11px]">
          <CompatPills cats={pet.okWithCats} dogs={pet.okWithDogs} children={pet.okWithChildren} hideNeg />
        </div>
        {pet.shelter && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[12.5px] text-muted-foreground">
            <Icon name="home" size={14} />
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{pet.shelter.name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

const cnSex = (sex: string) => (sex === "femelle" ? "inline-flex text-coral-600" : "inline-flex text-lavande-600");
