import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Home, Scale } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  PensionCard,
  PensionFilters,
  PensionCompareBar,
  getPensions,
  getRatingSummariesForPensions,
  PENSION_SERVICE_KEYS,
  type PensionServiceKey,
} from "@pensions/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@shared/ui/empty-state";

export const metadata: Metadata = {
  title: "Pensions pour animaux",
  description:
    "Annuaire des pensions professionnelles agréées pour chats et chiens, partout en France. SIRET et agrément préfecture vérifiés par l'équipe Dorloter.",
  alternates: { canonical: "/pensions" },
  openGraph: {
    title: "Pensions pour animaux · Dorloter",
    description:
      "Pensions professionnelles agréées pour vos chats et chiens. SIRET et agrément vérifiés, contact direct.",
    url: "/pensions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pensions pour animaux · Dorloter",
    description:
      "Trouvez une pension professionnelle agréée pour votre animal · SIRET vérifié.",
  },
};

interface Props {
  searchParams: Promise<{
    cats?: string;
    dogs?: string;
    maxPriceCat?: string;
    maxPriceDog?: string;
    services?: string;
    q?: string;
  }>;
}

function parseServices(raw: string | undefined): PensionServiceKey[] {
  if (!raw) return [];
  const allowed = new Set<string>(PENSION_SERVICE_KEYS);
  return raw
    .split(",")
    .filter((s) => allowed.has(s)) as PensionServiceKey[];
}

function parsePrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function PensionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const acceptsCats = sp.cats === "1";
  const acceptsDogs = sp.dogs === "1";

  const pensions = await getPensions({
    acceptsCats: acceptsCats || undefined,
    acceptsDogs: acceptsDogs || undefined,
    maxPriceCat: parsePrice(sp.maxPriceCat),
    maxPriceDog: parsePrice(sp.maxPriceDog),
    services: parseServices(sp.services),
    search: sp.q,
  });

  const ratings = await getRatingSummariesForPensions(
    pensions.map((p) => p.id)
  );

  return (
    <>
      <Navbar />
      <PageContainer variant="wide" className="space-y-8 py-10">
        <PageHeader
          title="Pensions partenaires"
          description="Établissements professionnels agréés qui accueillent votre animal quand vous devez vous absenter. SIRET et agrément préfecture vérifiés."
          actions={
            <Link
              href="/pensions/nouvelle"
              className="inline-flex items-center gap-1.5 rounded-full border border-coral-300 bg-coral-50 px-4 py-2 text-sm font-medium text-coral-700 hover:bg-coral-100"
            >
              <Plus className="h-4 w-4" />
              Référencer ma pension
            </Link>
          }
        />

        <PensionFilters />

        {pensions.length === 0 ? (
          <EmptyState
            variant="illustrated"
            icon={<Home className="h-9 w-9" />}
            title="Aucune pension ne correspond"
            hint="Essayez d'élargir les filtres, ou contactez-nous pour suggérer une pension à référencer."
            action={
              <Link
                href="/pensions"
                className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Voir toutes les pensions
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {pensions.length} pension{pensions.length > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Scale className="h-3.5 w-3.5" />
                Cochez jusqu&apos;à 3 pensions pour les comparer
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pensions.map((pension) => (
                <PensionCard
                  key={pension.id}
                  pension={pension}
                  rating={ratings.get(pension.id) ?? null}
                />
              ))}
            </div>
          </>
        )}
      </PageContainer>
      <PensionCompareBar />
      <Footer />
    </>
  );
}
