import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  Clock,
  PencilLine,
  Printer,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  getReportWithPhotos,
  getMatchesForReport,
  getSightingsForReport,
  computeMatchBreakdown,
  ReportContactReveal,
  ReportShare,
  ReportPhotoGallery,
  ResolveReportButton,
  ReportMatches,
  ReportSearchMap,
  ReportActivityFeedLive,
  ReportSightingModalButton,
  ReportTipsBanner,
  ReportDetailShell,
  type ActivityEvent,
  type MatchMarker,
  type SightingMarker,
} from "@lost-found/public";
import { getCurrentSession } from "@infra/auth/session";
import { getVetAlertSummaryForReport } from "@veterinarians/public";
import { ReportContentDialog } from "@moderation/public";
import { TrackVisit } from "@/components/pwa/track-visit";
import { DemoBadge } from "@shared/ui/demo-badge";
import { placeholderPets } from "@shared/utils/placeholder-images";

const fallbackPhotos = Object.values(placeholderPets);

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
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

  const [matches, sightings, session, vetAlertSummary] = await Promise.all([
    getMatchesForReport(id),
    getSightingsForReport(id),
    getCurrentSession(),
    getVetAlertSummaryForReport(id),
  ]);
  const isOwner = session?.user.id === report.userId;

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

  const primaryPhoto =
    report.photos.find((p) => p.isPrimary) ?? report.photos[0] ?? null;

  // `getReportWithPhotos` passe par unstable_cache qui sérialise les Date
  // en string (JSON). On re-hydrate tout ce qu'on utilise comme Date ici.
  const reportCreatedAt = new Date(report.createdAt);
  const reportUpdatedAt = new Date(report.updatedAt);
  const reportResolvedAt = report.resolvedAt
    ? new Date(report.resolvedAt)
    : null;
  const dateEvent = new Date(report.dateEvent);
  const daysActive = Math.max(
    0,
    Math.floor((Date.now() - reportCreatedAt.getTime()) / 86_400_000)
  );
  const lastUpdate = computeLastUpdate(reportUpdatedAt, sightings, matches);

  // Sightings vers markers carte
  const sightingMarkers: SightingMarker[] = sightings.map((s) => ({
    id: s.id,
    latitude: s.location.y,
    longitude: s.location.x,
    description: s.description,
    observedAt: s.observedAt,
    userName: s.userName,
    address: s.address,
  }));

  // Matches vers markers carte
  const matchMarkers: MatchMarker[] = matches
    .filter((m) => m.other.location)
    .map((m) => ({
      id: m.other.id,
      latitude: m.other.location!.y,
      longitude: m.other.location!.x,
      petName: m.other.petName,
      type: m.other.type,
    }));

  // Flux d'activité agrégé
  const activity = buildActivityFeed(
    {
      id: report.id,
      userId: report.userId,
      type: report.type,
      createdAt: reportCreatedAt,
      resolvedAt: reportResolvedAt,
    },
    sightings,
    matches,
    vetAlertSummary
  );

  const topBar = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/perdus-trouves"
          aria-label="Retour aux signalements"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <StatusBadge status={report.status} />
        <span className="text-sm text-foreground">
          <strong>
            {report.petName ??
              (report.type === "perdu" ? "Animal perdu" : "Animal trouvé")}
          </strong>
          {report.breed && (
            <span className="text-muted-foreground"> · {report.breed}</span>
          )}
          {report.species && (
            <span className="text-muted-foreground">
              {" · "}
              {report.species === "chat" ? "Chat" : "Chien"}
            </span>
          )}
        </span>
        {report.isDemo && <DemoBadge variant="compact" />}
      </div>
      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Dernière maj · {formatRelativeShort(lastUpdate)}
      </div>
    </div>
  );

  const leftSidebar = (
    <div className="space-y-3 p-3">
      {/* Fiche animal compacte */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative aspect-square w-full bg-muted">
          <Image
            src={
              primaryPhoto?.url ||
              fallbackPhotos[
                (report.petName ?? "X").charCodeAt(0) % fallbackPhotos.length
              ]!
            }
            alt={report.petName ?? "Animal signalé"}
            fill
            className="object-cover"
            sizes="340px"
            priority
          />
        </div>
        <div className="space-y-2 p-3">
          <h1 className="text-xl font-bold text-foreground">
            {report.petName ??
              (report.type === "perdu" ? "Sans nom" : "Animal trouvé")}
          </h1>
          <dl className="space-y-1.5 text-sm">
            <FieldRow
              label="Espèce"
              value={report.species === "chat" ? "Chat" : "Chien"}
            />
            {report.breed && (
              <FieldRow label="Race" value={report.breed} />
            )}
            {report.color && (
              <FieldRow label="Couleur" value={report.color} />
            )}
            <FieldRow label="Sexe" value={labelSex(report.sex)} />
            <FieldRow
              label={report.type === "perdu" ? "Disparu" : "Trouvé"}
              value={dateEvent.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            />
            {report.address && (
              <FieldRow label="Dernier lieu" value={report.address} />
            )}
            {report.isChipped && (
              <FieldRow
                label="Pucé"
                value={report.chipNumber ?? "Oui"}
              />
            )}
          </dl>
        </div>
      </div>

      <ReportContactReveal
        reportId={report.id}
        hasPhone={!!report.contactPhone}
        hasEmail={!!report.contactEmail}
      />

      {/* Description */}
      <section className="rounded-xl border border-border bg-card p-3">
        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Description
        </h2>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {report.description}
        </p>
        {report.distinctiveSigns && (
          <>
            <h2 className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Signes distinctifs
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {report.distinctiveSigns}
            </p>
          </>
        )}
        {report.notes && (
          <>
            <h2 className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {report.notes}
            </p>
          </>
        )}
      </section>

      {/* Galerie photos additionnelles si plus d'une */}
      {report.photos.length > 1 && (
        <section className="rounded-xl border border-border bg-card p-3">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Photos ({report.photos.length})
          </h2>
          <ReportPhotoGallery
            photos={report.photos}
            alt={
              report.petName ??
              (report.type === "perdu" ? "Animal perdu" : "Animal trouvé")
            }
          />
        </section>
      )}

      {/* Banner profil incomplet (owner only) */}
      {isOwner && report.status === "actif" && (
        <CompletionBanner reportId={report.id} report={report} />
      )}

      {/* Tips conseils */}
      <ReportTipsBanner type={report.type} daysActive={daysActive} />

      {/* Matches */}
      {matches.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-3">
          <header className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-foreground">
              Pistes de correspondance
            </h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              {matches.length}
            </span>
          </header>
          <ReportMatches
            matches={matchesWithBreakdown}
            canRespond={isOwner}
          />
        </section>
      )}

      {report.isDemo && <DemoBadge variant="banner" />}
    </div>
  );

  const rightSidebar = (
    <div className="space-y-4 p-3">
      {report.status === "actif" && (
        <ReportSightingModalButton
          reportId={report.id}
          isSignedIn={!!session}
          defaultCenter={
            report.location
              ? {
                  latitude: report.location.y,
                  longitude: report.location.x,
                }
              : undefined
          }
        />
      )}

      <ReportActivityFeedLive
        reportId={report.id}
        initialEvents={activity}
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
        photoUrl={primaryPhoto?.url ?? null}
      />

      <Link
        href={`/perdus-trouves/${report.id}/affiche`}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50"
      >
        <Printer className="h-4 w-4" />
        Télécharger l&apos;affiche
      </Link>

      {isOwner && report.status === "actif" && (
        <ResolveReportButton reportId={report.id} type={report.type} />
      )}

      {!isOwner && (
        <div className="border-t border-border pt-3">
          <ReportContentDialog
            contentType="report"
            contentId={report.id}
            label="Signaler ce signalement"
            size="sm"
          />
        </div>
      )}
    </div>
  );

  const centerMap = report.location ? (
    <ReportSearchMap
      lastKnown={{
        latitude: report.location.y,
        longitude: report.location.x,
        label: "Dernier point connu",
      }}
      sightings={sightingMarkers}
      matches={matchMarkers}
      fillParent
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-sable-100 text-sm text-muted-foreground">
      Pas de localisation renseignée.
    </div>
  );

  return (
    <>
      <Navbar />
      <TrackVisit
        url={`/perdus-trouves/${report.id}`}
        title={
          report.petName ??
          (report.type === "perdu" ? "Animal perdu" : "Animal trouvé")
        }
      />
      <ReportDetailShell
        topBar={topBar}
        leftSidebar={leftSidebar}
        centerMap={centerMap}
        rightSidebar={rightSidebar}
      />
    </>
  );
}

function StatusBadge({ status }: { status: "actif" | "resolu" | "expire" }) {
  if (status === "resolu") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-green-800">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Retrouvé
      </span>
    );
  }
  if (status === "expire") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sable-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-sable-800">
        <span className="h-2 w-2 rounded-full bg-sable-400" />
        Archivé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-coral-800">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-400/75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-coral-500" />
      </span>
      Alerte active
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function labelSex(sex: "male" | "femelle" | "inconnu"): string {
  if (sex === "male") return "Mâle";
  if (sex === "femelle") return "Femelle";
  return "Inconnu";
}

function formatRelativeShort(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function computeLastUpdate(
  reportUpdatedAt: Date,
  sightings: Array<{ createdAt: Date | string }>,
  matches: Array<{ match: { createdAt: Date | string } }>
): Date {
  const dates: Date[] = [
    reportUpdatedAt,
    ...sightings.map((s) => new Date(s.createdAt)),
    ...matches.map((m) => new Date(m.match.createdAt)),
  ];
  return dates.reduce(
    (max, d) => (d.getTime() > max.getTime() ? d : max),
    reportUpdatedAt
  );
}

function buildActivityFeed(
  report: {
    id: string;
    userId: string;
    type: "perdu" | "trouve";
    createdAt: Date;
    resolvedAt: Date | null;
  },
  sightings: Array<{
    id: string;
    userId: string;
    description: string;
    userName: string;
    createdAt: Date | string;
    address: string | null;
  }>,
  matches: Array<{
    match: { id: string; createdAt: Date | string };
    other: { petName: string | null; type: "perdu" | "trouve" };
  }>,
  vetAlertSummary: { count: number; firstAlertedAt: Date | null }
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  events.push({
    id: `created-${report.id}`,
    kind: "created",
    title:
      report.type === "perdu" ? "Alerte créée" : "Animal trouvé signalé",
    description:
      report.type === "perdu"
        ? "Le signalement est désormais visible publiquement et entré dans le matching."
        : "L'animal est en attente d'identification.",
    at: report.createdAt,
    byOwner: true,
  });

  for (const s of sightings) {
    events.push({
      id: `sighting-${s.id}`,
      kind: "sighting",
      title: `${s.userName} l'a aperçu`,
      description: s.address
        ? `${s.description.slice(0, 80)}${s.description.length > 80 ? "…" : ""} · ${s.address}`
        : s.description.slice(0, 100),
      at: new Date(s.createdAt),
      byOwner: s.userId === report.userId,
    });
  }

  for (const m of matches) {
    events.push({
      id: `match-${m.match.id}`,
      kind: "match",
      title: "Piste détectée",
      description: m.other.petName
        ? `Correspondance avec ${m.other.petName} (${m.other.type === "perdu" ? "perdu" : "trouvé"})`
        : `Correspondance avec un signalement ${m.other.type === "perdu" ? "perdu" : "trouvé"}`,
      at: new Date(m.match.createdAt),
    });
  }

  if (vetAlertSummary.count > 0 && vetAlertSummary.firstAlertedAt) {
    events.push({
      id: `vet-alerted-${report.id}`,
      kind: "vet_alerted",
      title: `${vetAlertSummary.count} cabinet${vetAlertSummary.count > 1 ? "s" : ""} vétérinaire${vetAlertSummary.count > 1 ? "s" : ""} alerté${vetAlertSummary.count > 1 ? "s" : ""}`,
      description:
        "Les vétos du secteur ont été prévenus automatiquement. Ils peuvent croiser la fiche avec une consultation suspecte.",
      at: new Date(vetAlertSummary.firstAlertedAt),
    });
  }

  if (report.resolvedAt) {
    events.push({
      id: `resolved-${report.id}`,
      kind: "resolved",
      title: "Animal retrouvé",
      description: "L'auteur a marqué le signalement comme résolu.",
      at: report.resolvedAt,
      byOwner: true,
    });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
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
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-coral-200 bg-coral-50/70 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-coral-600" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            Complétez votre fiche pour mieux retrouver
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Il manque : <strong>{missing.join(", ")}</strong>.
          </p>
        </div>
      </div>
      <Link
        href={`/mes-signalements/${reportId}/edit`}
        className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600"
      >
        <PencilLine className="h-3.5 w-3.5" />
        Compléter
      </Link>
    </div>
  );
}
