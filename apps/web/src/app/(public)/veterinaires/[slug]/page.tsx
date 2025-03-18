import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Siren,
  Stethoscope,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageContainer } from "@/components/layout/page-container";
import { TripEstimateWidget } from "@/components/shared/trip-estimate-widget";
import { DemoBadge } from "@shared/ui/demo-badge";
import { getVeterinarianBySlug } from "@veterinarians/public";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vet = await getVeterinarianBySlug(slug);
  if (!vet) return { title: "Cabinet introuvable" };
  return {
    title: `${vet.name} · Vétérinaire`,
    description:
      vet.description ??
      `Cabinet vétérinaire ${vet.name}, vérifié par Dorloter.`,
    openGraph: {
      title: `${vet.name} · Vétérinaire`,
      description: vet.description ?? undefined,
      type: "website",
    },
  };
}

export default async function VetDetailPage({ params }: Props) {
  const { slug } = await params;
  const vet = await getVeterinarianBySlug(slug);
  if (!vet || !vet.isVerified) notFound();

  return (
    <>
      <Navbar />
      <PageContainer variant="wide" className="space-y-8 py-10">
        {vet.isDemo && <DemoBadge variant="banner" />}
        <Link
          href="/veterinaires"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à l&apos;annuaire
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {vet.name}
            </h1>
            <span
              title="Cabinet vérifié"
              className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
            >
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Vérifié Dorloter
            </span>
            {vet.emergencyAvailable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2.5 py-1 text-xs font-semibold text-coral-700">
                <Siren className="h-3.5 w-3.5" />
                Urgences 24/7
              </span>
            )}
          </div>
          {vet.address && (
            <p className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {vet.address}
            </p>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Colonne principale */}
          <div className="space-y-6 lg:col-span-2">
            {vet.description && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  À propos
                </h2>
                <p className="whitespace-pre-line text-foreground">
                  {vet.description}
                </p>
              </section>
            )}

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Espèces prises en charge
              </h2>
              <div className="flex flex-wrap gap-2">
                {vet.acceptsCats && (
                  <span className="inline-flex items-center rounded-full bg-sable-100 px-3 py-1 text-sm text-foreground">
                    Chats
                  </span>
                )}
                {vet.acceptsDogs && (
                  <span className="inline-flex items-center rounded-full bg-sable-100 px-3 py-1 text-sm text-foreground">
                    Chiens
                  </span>
                )}
                {vet.acceptsNac && (
                  <span className="inline-flex items-center rounded-full bg-sable-100 px-3 py-1 text-sm text-foreground">
                    NAC
                  </span>
                )}
                {!vet.acceptsCats && !vet.acceptsDogs && !vet.acceptsNac && (
                  <span className="text-sm text-muted-foreground">
                    Non renseigné
                  </span>
                )}
              </div>
            </section>

            {(vet.openingHours || vet.consultationPrice) && (
              <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
                {vet.openingHours && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Horaires
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                      {vet.openingHours}
                    </p>
                  </div>
                )}
                {vet.consultationPrice && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Consultation
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      à partir de{" "}
                      <strong>{Number(vet.consultationPrice)} €</strong>{" "}
                      <span className="text-muted-foreground">
                        (indicatif)
                      </span>
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sidebar contact */}
          <aside className="space-y-4">
            <section className="rounded-xl border border-teal-200 bg-teal-50/40 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal-700">
                Contact
              </h2>
              <div className="space-y-2.5">
                {vet.phone && (
                  <a
                    href={`tel:${vet.phone}`}
                    className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-foreground hover:bg-teal-100/50"
                  >
                    <Phone className="h-4 w-4 text-teal-700" />
                    {vet.phone}
                  </a>
                )}
                {vet.email && (
                  <a
                    href={`mailto:${vet.email}`}
                    className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-foreground hover:bg-teal-100/50"
                  >
                    <Mail className="h-4 w-4 text-teal-700" />
                    {vet.email}
                  </a>
                )}
                {vet.website && (
                  <a
                    href={vet.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-foreground hover:bg-teal-100/50"
                  >
                    <ExternalLink className="h-4 w-4 text-teal-700" />
                    Site web
                  </a>
                )}
                {!vet.phone && !vet.email && !vet.website && (
                  <p className="text-sm text-muted-foreground">
                    Aucun moyen de contact renseigné.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Identification professionnelle
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">SIRET</dt>
                  <dd className="font-mono text-foreground">{vet.siret}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Inscription ONV
                  </dt>
                  <dd className="font-mono text-foreground">
                    {vet.orderNumber}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                <Stethoscope className="mr-1 inline-block h-3 w-3" />
                Vérifié par Dorloter sur la base de l&apos;
                <Link
                  href="https://annuaire-vet.ordre.veterinaire.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:underline"
                >
                  annuaire officiel ONV
                </Link>
                . Ne remplace pas la source officielle.
              </p>
            </section>

            <TripEstimateWidget targetType="vet" targetId={vet.id} />
          </aside>
        </div>
      </PageContainer>
      <Footer />
    </>
  );
}
