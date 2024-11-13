import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Cat, Dog, Star, ShieldCheck, Check, X } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";
import {
  getPensionsBySlugs,
  getRatingSummariesForPensions,
  PENSION_SERVICE_KEYS,
  type PensionServiceKey,
} from "@pensions/public";
import { placeholderCovers } from "@shared/utils/placeholder-images";

export const metadata: Metadata = {
  title: "Comparer les pensions",
  description:
    "Comparaison côte à côte de pensions sélectionnées : prix, services, capacité, agrément.",
  alternates: { canonical: "/pensions/compare" },
};

const SERVICE_LABELS: Record<PensionServiceKey, string> = {
  medication: "Médicaments",
  grooming: "Toilettage",
  outdoorAccess: "Accès extérieur",
  nightStaff: "Personnel de nuit",
  transport: "Transport",
  senior: "Soins seniors",
};

interface Props {
  searchParams: Promise<{ slugs?: string }>;
}

export default async function ComparePensionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const slugs = (sp.slugs ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (slugs.length === 0) {
    return <EmptyState />;
  }

  const pensions = await getPensionsBySlugs(slugs);
  if (pensions.length === 0) {
    return <EmptyState />;
  }

  const ratings = await getRatingSummariesForPensions(
    pensions.map((p) => p.id)
  );

  return (
    <>
      <Navbar />
      <PageContainer variant="wide" className="space-y-8 py-10">
        <div>
          <Link
            href="/pensions"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour à l&apos;annuaire
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Comparaison
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pensions.length} pension{pensions.length > 1 ? "s" : ""} côte à
            côte. Cliquez sur une fiche pour voir le détail.
          </p>
        </div>

        {/* Vue mobile : cards empilées avec recap. Vue desktop : tableau */}
        <div className="grid gap-5 md:hidden">
          {pensions.map((p) => {
            const rating = ratings.get(p.id);
            const services = (p.services ?? {}) as Record<string, boolean>;
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-[5/3] bg-sable-100">
                  <Image
                    src={p.coverUrl ?? placeholderCovers.shelter}
                    alt={p.name}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <Link
                    href={`/pensions/${p.slug}`}
                    className="font-bold hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.address ?? "Adresse non communiquée"}
                  </p>
                  <Stat label="Note">
                    {rating && rating.count > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {rating.average.toFixed(1)} ({rating.count})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    )}
                  </Stat>
                  <Stat label="Espèces">
                    <span className="inline-flex items-center gap-2">
                      {p.acceptsCats && <Cat className="h-3.5 w-3.5" />}
                      {p.acceptsDogs && <Dog className="h-3.5 w-3.5" />}
                      {!p.acceptsCats && !p.acceptsDogs && (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </span>
                  </Stat>
                  <Stat label="Tarif chat">
                    {p.acceptsCats && p.pricePerDayCat
                      ? `${Number(p.pricePerDayCat)} € / jour`
                      : "·"}
                  </Stat>
                  <Stat label="Tarif chien">
                    {p.acceptsDogs && p.pricePerDayDog
                      ? `${Number(p.pricePerDayDog)} € / jour`
                      : "·"}
                  </Stat>
                  <Stat label="Capacité">
                    {[
                      p.capacityCats ? `${p.capacityCats} chats` : null,
                      p.capacityDogs ? `${p.capacityDogs} chiens` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "·"}
                  </Stat>
                  <Stat label="Agrément">
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Vérifié
                    </span>
                  </Stat>
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Services
                    </p>
                    <ul className="space-y-1 text-sm">
                      {PENSION_SERVICE_KEYS.map((key) => (
                        <li
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-muted-foreground">
                            {SERVICE_LABELS[key]}
                          </span>
                          {services[key] ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-sable-300" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tableau desktop */}
        <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 w-44 bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Critère
                  </th>
                  {pensions.map((p) => (
                    <th
                      key={p.id}
                      scope="col"
                      className="px-4 py-3 text-left align-bottom"
                    >
                      <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-sable-100">
                        <Image
                          src={p.coverUrl ?? placeholderCovers.shelter}
                          alt={p.name}
                          fill
                          sizes="240px"
                          className="object-cover"
                        />
                      </div>
                      <Link
                        href={`/pensions/${p.slug}`}
                        className="mt-2 block text-base font-bold text-foreground hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.address && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {p.address}
                        </p>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <Row
                  label="Note moyenne"
                  cells={pensions.map((p) => {
                    const r = ratings.get(p.id);
                    return r && r.count > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <strong className="text-foreground">
                          {r.average.toFixed(1)}
                        </strong>
                        <span className="text-muted-foreground">
                          / 5 · {r.count} avis
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pas encore</span>
                    );
                  })}
                />
                <Row
                  label="Espèces accueillies"
                  cells={pensions.map((p) => (
                    <span className="inline-flex items-center gap-2">
                      {p.acceptsCats && (
                        <span className="inline-flex items-center gap-1">
                          <Cat className="h-3.5 w-3.5" />
                          chats
                        </span>
                      )}
                      {p.acceptsDogs && (
                        <span className="inline-flex items-center gap-1">
                          <Dog className="h-3.5 w-3.5" />
                          chiens
                        </span>
                      )}
                      {!p.acceptsCats && !p.acceptsDogs && (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </span>
                  ))}
                />
                <Row
                  label="Tarif chat / jour"
                  cells={pensions.map((p) =>
                    p.acceptsCats && p.pricePerDayCat ? (
                      <strong className="text-foreground">
                        {Number(p.pricePerDayCat)} €
                      </strong>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    )
                  )}
                />
                <Row
                  label="Tarif chien / jour"
                  cells={pensions.map((p) =>
                    p.acceptsDogs && p.pricePerDayDog ? (
                      <strong className="text-foreground">
                        {Number(p.pricePerDayDog)} €
                      </strong>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    )
                  )}
                />
                <Row
                  label="Capacité"
                  cells={pensions.map((p) => {
                    const parts = [
                      p.capacityCats ? `${p.capacityCats} chats` : null,
                      p.capacityDogs ? `${p.capacityDogs} chiens` : null,
                    ].filter(Boolean);
                    return parts.length > 0 ? (
                      <span>{parts.join(" · ")}</span>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    );
                  })}
                />
                <Row
                  label="Agrément vérifié"
                  cells={pensions.map(() => (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <ShieldCheck className="h-4 w-4" />
                      Oui
                    </span>
                  ))}
                />
                {PENSION_SERVICE_KEYS.map((key) => (
                  <Row
                    key={key}
                    label={SERVICE_LABELS[key]}
                    cells={pensions.map((p) => {
                      const services = (p.services ?? {}) as Record<
                        string,
                        boolean
                      >;
                      return services[key] ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-sable-300" />
                      );
                    })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Les prix affichés sont indicatifs · confirmez auprès de chaque
          pension avant de réserver.
        </p>
      </PageContainer>
      <Footer />
    </>
  );
}

function EmptyState() {
  return (
    <>
      <Navbar />
      <PageContainer variant="wide" className="py-20 text-center">
        <h1 className="text-2xl font-bold">Comparaison vide</h1>
        <p className="mt-2 text-muted-foreground">
          Sélectionnez au moins deux pensions depuis l&apos;annuaire.
        </p>
        <Link
          href="/pensions"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600"
        >
          Aller à l&apos;annuaire
        </Link>
      </PageContainer>
      <Footer />
    </>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-border py-1.5 text-sm first:border-t-0 first:pt-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function Row({
  label,
  cells,
}: {
  label: string;
  cells: React.ReactNode[];
}) {
  return (
    <tr>
      <th
        scope="row"
        className="sticky left-0 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </th>
      {cells.map((c, i) => (
        <td key={i} className="px-4 py-3 align-middle">
          {c}
        </td>
      ))}
    </tr>
  );
}
