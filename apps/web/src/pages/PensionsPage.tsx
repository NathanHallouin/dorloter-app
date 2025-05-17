import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { pensionsApi } from "@dorloter/client";
import type { PensionSummary } from "@dorloter/client";
import { PageHead, PageBody, EmptyState } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { Pill } from "@dorloter/ui";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5 text-lavande-500">
      {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={13} fill={i < Math.round(n) ? "var(--lavande-500)" : "none"} />)}
    </span>
  );
}

function PensionCard({ p }: { p: PensionSummary }) {
  const price = [p.pricePerDayCat, p.pricePerDayDog].filter((v): v is number => v != null).sort((a, b) => a - b)[0];
  return (
    <Link to={`/pensions/${p.slug}`} className="block overflow-hidden rounded-[6px] border border-line bg-card">
      <div className="relative aspect-video bg-muted">
        {p.coverUrl ? <img src={p.coverUrl} alt={p.name} className="h-full w-full object-cover" />
          : <div className="grid h-full w-full place-items-center text-sable-300"><Icon name="home" size={40} /></div>}
        <div className="absolute left-2.5 top-2.5"><Pill tone="white" icon="shieldCheck">Agréée</Pill></div>
      </div>
      <div className="px-[18px] py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[20px] font-semibold text-foreground">{p.name}</h3>
          {p.rating && <span className="mono inline-flex items-center gap-1.5 text-[12px] text-lavande-700"><Stars n={p.rating.average} /> {p.rating.average}</span>}
        </div>
        {p.address && <p className="mt-[3px] text-[13.5px] text-muted-foreground">{p.address}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.acceptsCats && <Pill tone="coral" icon="cat">Chats</Pill>}
          {p.acceptsDogs && <Pill tone="lavande" icon="dog">Chiens</Pill>}
        </div>
        {price != null && (
          <p className="mono mt-3 border-t border-line pt-3 text-[13px] text-foreground">
            dès <strong className="tabular text-[16px]">{price} €</strong> / jour
          </p>
        )}
      </div>
    </Link>
  );
}

export function PensionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["pensions"], queryFn: () => pensionsApi.list() });
  const pensions = data?.data ?? [];

  return (
    <div>
      <PageHead crumb="Pensions" title="Pensions agréées" sub="Professionnels vérifiés (SIRET + agrément). Contact direct, sans intermédiaire." />
      <PageBody>
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && pensions.length === 0 ? (
          <EmptyState icon="home" title="Aucune pension pour le moment" text="Les pensions agréées apparaîtront ici une fois vérifiées." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]">
            {pensions.map((p) => <PensionCard key={p.id} p={p} />)}
          </div>
        )}
      </PageBody>
    </div>
  );
}
