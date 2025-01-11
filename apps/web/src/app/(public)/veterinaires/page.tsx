import type { Metadata } from "next";
import Link from "next/link";
import {
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Siren,
  Stethoscope,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@shared/ui/empty-state";
import { Input } from "@shared/ui/input";
import { DemoBadge } from "@shared/ui/demo-badge";
import { getVerifiedVeterinarians } from "@veterinarians/public";

export const metadata: Metadata = {
  title: "Vétérinaires partenaires",
  description:
    "Annuaire des cabinets vétérinaires partenaires Dorloter. SIRET et numéro d'inscription à l'Ordre des Vétérinaires vérifiés par notre équipe.",
  alternates: { canonical: "/veterinaires" },
  openGraph: {
    title: "Vétérinaires partenaires · Dorloter",
    description:
      "Trouvez un vétérinaire vérifié près de chez vous. SIRET et numéro ONV cross-checkés.",
    url: "/veterinaires",
    type: "website",
  },
};

interface Props {
  searchParams: Promise<{
    q?: string;
    cats?: string;
    dogs?: string;
    nac?: string;
    emergency?: string;
  }>;
}

export default async function VeterinairesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = {
    search: sp.q?.trim() || undefined,
    acceptsCats: sp.cats === "1",
    acceptsDogs: sp.dogs === "1",
    acceptsNac: sp.nac === "1",
    emergencyOnly: sp.emergency === "1",
  };
  const vets = await getVerifiedVeterinarians(filters);

  return (
    <>
      <Navbar />
      <PageContainer variant="wide" className="space-y-8 py-10">
        <PageHeader
          title="Vétérinaires partenaires"
          description="Cabinets vétérinaires inscrits sur Dorloter. SIRET et numéro d'inscription à l'Ordre National des Vétérinaires vérifiés par notre équipe."
          actions={
            <Link
              href="/veterinaires/nouveau"
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
            >
              <Plus className="h-4 w-4" />
              Référencer mon cabinet
            </Link>
          }
        />

        <form
          method="get"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={filters.search ?? ""}
              placeholder="Nom du cabinet ou ville…"
              className="pl-8"
            />
          </div>
          <FilterChip
            name="cats"
            label="Chats"
            active={filters.acceptsCats}
            current={filters}
          />
          <FilterChip
            name="dogs"
            label="Chiens"
            active={filters.acceptsDogs}
            current={filters}
          />
          <FilterChip
            name="nac"
            label="NAC"
            active={filters.acceptsNac}
            current={filters}
          />
          <FilterChip
            name="emergency"
            label="Urgences 24/7"
            active={filters.emergencyOnly}
            current={filters}
            accent
          />
          {(filters.search ||
            filters.acceptsCats ||
            filters.acceptsDogs ||
            filters.acceptsNac ||
            filters.emergencyOnly) && (
            <Link
              href="/veterinaires"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Réinitialiser
            </Link>
          )}
          <button type="submit" className="sr-only">
            Filtrer
          </button>
        </form>

        {vets.length === 0 ? (
          <EmptyState
            variant="illustrated"
            icon={<Stethoscope className="h-9 w-9" />}
            title="Aucun cabinet ne correspond"
            hint="Essayez d'élargir les filtres, ou contactez-nous pour suggérer un cabinet à référencer."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {vets.length} cabinet{vets.length > 1 ? "s" : ""} vérifié
              {vets.length > 1 ? "s" : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vets.map((vet) => (
                <Link
                  key={vet.id}
                  href={`/veterinaires/${vet.slug}`}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-teal-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">
                        {vet.name}
                      </h3>
                      {vet.address && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{vet.address}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        title="Cabinet vérifié"
                        className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700"
                      >
                        <ShieldCheck className="mr-0.5 h-3 w-3" />
                        Vérifié
                      </span>
                      {vet.isDemo && <DemoBadge variant="compact" />}
                    </div>
                  </div>
                  {vet.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {vet.description}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 text-[11px]">
                    {vet.acceptsCats && (
                      <span className="rounded-full bg-sable-100 px-2 py-0.5 text-muted-foreground">
                        Chats
                      </span>
                    )}
                    {vet.acceptsDogs && (
                      <span className="rounded-full bg-sable-100 px-2 py-0.5 text-muted-foreground">
                        Chiens
                      </span>
                    )}
                    {vet.acceptsNac && (
                      <span className="rounded-full bg-sable-100 px-2 py-0.5 text-muted-foreground">
                        NAC
                      </span>
                    )}
                    {vet.emergencyAvailable && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2 py-0.5 font-semibold text-coral-700">
                        <Siren className="h-3 w-3" />
                        Urgences 24/7
                      </span>
                    )}
                  </div>
                  {(vet.phone || vet.website) && (
                    <div className="flex flex-wrap gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
                      {vet.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {vet.phone}
                        </span>
                      )}
                      {vet.website && (
                        <span className="inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Site web
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}

        <p className="rounded-xl border border-dashed border-border bg-sable-50/40 p-4 text-xs text-muted-foreground">
          Vérifié par Dorloter sur la base du SIRET et du numéro
          d&apos;inscription à l&apos;Ordre National des Vétérinaires. Cette
          vérification ne remplace pas l&apos;annuaire officiel
          disponible sur{" "}
          <Link
            href="https://annuaire-vet.ordre.veterinaire.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 hover:underline"
          >
            ordre.veterinaire.fr
          </Link>
          .
        </p>
      </PageContainer>
      <Footer />
    </>
  );
}

function FilterChip({
  name,
  label,
  active,
  current,
  accent,
}: {
  name: string;
  label: string;
  active: boolean;
  current: { search?: string; acceptsCats: boolean; acceptsDogs: boolean; acceptsNac: boolean; emergencyOnly: boolean };
  accent?: boolean;
}) {
  const params = new URLSearchParams();
  if (current.search) params.set("q", current.search);
  if (current.acceptsCats && name !== "cats") params.set("cats", "1");
  if (current.acceptsDogs && name !== "dogs") params.set("dogs", "1");
  if (current.acceptsNac && name !== "nac") params.set("nac", "1");
  if (current.emergencyOnly && name !== "emergency") params.set("emergency", "1");
  if (!active) params.set(name, "1");
  const href = `/veterinaires?${params.toString()}`;

  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? accent
            ? "bg-coral-500 text-white"
            : "bg-teal-600 text-white"
          : "border border-border bg-card text-foreground hover:border-teal-300"
      }`}
    >
      {label}
    </Link>
  );
}
