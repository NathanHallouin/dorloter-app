import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth, digestApi } from "@dorloter/client";
import { Icon } from "@dorloter/ui";

const AGE_LABEL: Record<string, string> = { chaton: "Chaton", jeune: "Jeune", adulte: "Adulte", senior: "Senior" };
const fmtDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(0)} km`);

/**
 * Bandeau « Nouveautés près de vous » (feature 5.2). Suggère jusqu'à 3 animaux
 * récemment publiés dans le rayon de l'utilisateur. Ne s'affiche que pour un
 * utilisateur connecté ayant posé sa localisation et avec au moins un résultat.
 */
export function NearbyDigest() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-digest"],
    queryFn: () => digestApi.mine(),
    enabled: !!user,
  });

  if (!user || !data?.hasLocation || data.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1180px] px-8 pt-12">
      <div className="rounded-[10px] border border-coral-200 bg-coral-50/60 p-5">
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-coral-600"><Icon name="sparkles" size={20} /></span>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">Nouveautés près de vous</h2>
          </div>
          <span className="mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            dans un rayon de {data.radiusKm} km
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
          {data.items.map((p) => (
            <Link
              key={p.id}
              to={`/adopter/${p.id}`}
              className="group flex gap-3 overflow-hidden rounded-[8px] border border-line bg-card p-2.5 transition-colors hover:border-coral-400"
            >
              <div className="h-[76px] w-[76px] flex-none overflow-hidden rounded-[6px] bg-muted">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[34px]">{p.species === "chat" ? "🐱" : "🐶"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-[17px] font-semibold text-foreground">{p.name}</h3>
                  <span className={p.sex === "femelle" ? "flex-none text-coral-500" : "flex-none text-lavande-600"}>
                    <Icon name={p.sex === "femelle" ? "venus" : "mars"} size={14} />
                  </span>
                </div>
                <p className="mono mt-0.5 truncate text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground">
                  {p.ageCategory ? AGE_LABEL[p.ageCategory] : ""}{p.breed ? ` · ${p.breed}` : ""}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Icon name="marker" size={12} className="text-coral-500" />
                  {p.distanceMeters != null ? `à ${fmtDistance(p.distanceMeters)}` : p.shelterName}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
