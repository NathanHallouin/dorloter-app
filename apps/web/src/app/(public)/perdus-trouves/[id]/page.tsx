import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  ChevronLeft,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ReportStatusBadge } from "@lost-found/public";
import { ReportMatches } from "@lost-found/public";
import { ReportShare } from "@lost-found/public";
import { ReportPhotoGallery } from "@lost-found/public";
import { ReportContactReveal } from "@lost-found/public";
import { ResolveReportButton } from "@lost-found/public";
import { getReportWithPhotos } from "@lost-found/public";
import { getMatchesForReport } from "@lost-found/public";
import { computeMatchBreakdown } from "@lost-found/public";
import { getCurrentSession } from "@infra/auth/session";
import { LocationView } from "@/components/map/location-view";
import { ReportContentDialog } from "@moderation/public";
import { TrackVisit } from "@/components/pwa/track-visit";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getReportWithPhotos(id);
  if (!report) return { title: "Signalement introuvable" };

  const prefix = report.type === "perdu" ? "Animal perdu" : "Animal trouvé";
  const title = report.petName ? `${prefix} : ${report.petName}` : prefix;
  const description = report.description.slice(0, 160);
  const photo = report.photos.find((p) => p.isPrimary) ?? report.photos[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: photo ? [{ url: photo.url, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: photo ? [photo.url] : undefined,
    },
  };
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const report = await getReportWithPhotos(id);
  if (!report) notFound();

  const [matches, session] = await Promise.all([
    getMatchesForReport(id),
    getCurrentSession(),
  ]);
  const isOwner = session?.user.id === report.userId;

  // Breakdown calculé serveur — la composante "lost" est toujours le
  // signalement perdu, "found" le trouvé. On ordonne donc selon le type.
  const matchesWithBreakdown = matches.map((m) => {
    const lost = report.type === "perdu" ? report : m.other;
    const found = report.type === "trouve" ? report : m.other;
    const breakdown = computeMatchBreakdown(
      lost,
      found,
      m.match.distanceMeters ?? 0
    );
    return { ...m, breakdown };
  });

  const dateEvent = new Date(report.dateEvent).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <TrackVisit
          url={`/perdus-trouves/${report.id}`}
          title={
            report.petName ??
            (report.type === "perdu" ? "Animal perdu" : "Animal trouvé")
          }
        />
        <Link
          href="/perdus-trouves"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux signalements
        </Link>

        {/* Bandeau "avis de recherche" */}
        <header
          className={`mb-8 overflow-hidden rounded-lg border-l-4 ${
            report.type === "perdu"
              ? "border-prune-600 bg-prune-50/60"
              : "border-lavande-600 bg-lavande-50/60"
          }`}
        >
          <div className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.18em] ${
                  report.type === "perdu"
                    ? "bg-prune-600 text-white"
                    : "bg-lavande-600 text-white"
                }`}
              >
                {report.type === "perdu"
                  ? "Avis de recherche"
                  : "Cherche son foyer"}
              </span>
              <ReportStatusBadge status={report.status} />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {report.petName ??
                (report.type === "perdu" ? "Animal perdu" : "Animal trouvé")}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/80">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {report.type === "perdu" ? "Perdu le" : "Trouvé le"} {dateEvent}
              </span>
              {report.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {report.address}
                </span>
              )}
            </div>
          </div>
        </header>

        {isOwner && report.status === "actif" && (
          <CompletionBanner reportId={report.id} report={report} />
        )}

        <ReportPhotoGallery
          photos={report.photos}
          alt={
            report.petName ??
            (report.type === "perdu" ? "Animal perdu" : "Animal trouvé")
          }
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section>
              <h2 className="mb-2 text-lg font-semibold">Description</h2>
              <p className="whitespace-pre-wrap text-foreground">
                {report.description}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
              <InfoField label="Sexe" value={labelSex(report.sex)} />
              {report.color && (
                <InfoField label="Couleur" value={report.color} />
              )}
              {report.breed && <InfoField label="Race" value={report.breed} />}
              <InfoField
                label="Pucé"
                value={report.isChipped ? "Oui" : "Inconnu / Non"}
              />
              {report.chipNumber && (
                <InfoField label="N° de puce" value={report.chipNumber} />
              )}
            </section>

            {report.distinctiveSigns && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Signes distinctifs</h2>
                <p className="whitespace-pre-wrap text-foreground">
                  {report.distinctiveSigns}
                </p>
              </section>
            )}

            {report.notes && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Notes</h2>
                <p className="whitespace-pre-wrap text-foreground">
                  {report.notes}
                </p>
              </section>
            )}

            {report.location && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">
                  {report.type === "perdu" ? "Lieu de disparition" : "Lieu de la découverte"}
                </h2>
                <LocationView
                  latitude={report.location.y}
                  longitude={report.location.x}
                  markerColor={report.type === "perdu" ? "prune" : "lavande"}
                />
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <ReportContactReveal
              reportId={report.id}
              hasPhone={!!report.contactPhone}
              hasEmail={!!report.contactEmail}
            />

            <ReportShare
              reportId={report.id}
              type={report.type}
              petName={report.petName}
              description={report.description}
              color={report.color}
              breed={report.breed}
              address={report.address}
              dateEvent={report.dateEvent}
              contactPhone={report.contactPhone}
              photoUrl={
                (report.photos.find((p) => p.isPrimary) ?? report.photos[0])
                  ?.url ?? null
              }
            />

            {isOwner && report.status === "actif" && (
              <ResolveReportButton reportId={report.id} type={report.type} />
            )}
          </aside>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">
            Pistes ({matches.length})
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Les annonces d&apos;en face qui pourraient correspondre · lieu,
            description, période.
          </p>
          <ReportMatches matches={matchesWithBreakdown} canRespond={isOwner} />
        </section>

        {!isOwner && (
          <div className="mt-8 flex justify-end border-t border-border pt-4">
            <ReportContentDialog
              contentType="report"
              contentId={report.id}
              label="Signaler ce signalement"
              size="sm"
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function labelSex(sex: "male" | "femelle" | "inconnu"): string {
  if (sex === "male") return "Mâle";
  if (sex === "femelle") return "Femelle";
  return "Inconnu";
}

interface ReportLite {
  id: string;
  description: string;
  color: string | null;
  breed: string | null;
  distinctiveSigns: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  photos: Array<{ id: string }>;
}

/**
 * Banner affiché à l'auteur d'un signalement actif quand sa fiche manque
 * d'éléments utiles au matching ou au contact. Encourage la "publication
 * progressive".
 */
function CompletionBanner({
  reportId,
  report,
}: {
  reportId: string;
  report: ReportLite;
}) {
  const missing: string[] = [];
  if (report.photos.length === 0) missing.push("aucune photo");
  if (!report.color) missing.push("couleur");
  if (!report.breed) missing.push("race");
  if (!report.distinctiveSigns) missing.push("signes distinctifs");
  if (!report.contactPhone && !report.contactEmail) missing.push("contact");

  if (missing.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-coral-200 bg-coral-50/70 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-coral-600" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            Complétez votre fiche pour mieux retrouver
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Il manque : <strong>{missing.join(", ")}</strong>. Plus la fiche
            est complète, plus le système peut faire le lien avec une
            annonce en face.
          </p>
        </div>
      </div>
      <Link
        href={`/mes-signalements/${reportId}/edit`}
        className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-coral-600"
      >
        <PencilLine className="h-3.5 w-3.5" />
        Compléter
      </Link>
    </div>
  );
}
