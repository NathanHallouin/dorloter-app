import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  EyeOff,
  ExternalLink,
  Flag,
  ShieldX,
} from "lucide-react";
import { requireAuth } from "@infra/auth/session";
import { getContentReportsByUser } from "@moderation/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@shared/ui/empty-state";
import { cn } from "@shared/utils";
import type { UserContentReport } from "@moderation/public";

export const metadata: Metadata = {
  title: "Mes signalements de contenu",
};

const REASON_LABELS: Record<string, string> = {
  // Cas typiques — la liste réelle vient de la modale, on en fait un mapping
  // friendly pour l'affichage. Tout autre code reste tel quel.
  false_listing: "Annonce frauduleuse",
  poor_conditions: "Conditions douteuses",
  inappropriate_photo: "Photo inappropriée",
  spam: "Spam ou démarchage",
  harassment: "Harcèlement",
  fraud: "Tentative de fraude",
  not_a_shelter: "Pas un vrai refuge",
  duplicate: "Doublon",
  other: "Autre",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  pet: "Animal à adopter",
  report: "Signalement perdu/trouvé",
  shelter: "Refuge",
  user: "Utilisateur",
};

const STATUS_META: Record<
  UserContentReport["status"],
  { label: string; tone: string; icon: React.ReactNode; description: string }
> = {
  en_attente: {
    label: "En cours d'examen",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
    description: "Un humain de l'équipe va trancher.",
  },
  masque: {
    label: "Contenu masqué",
    tone: "bg-green-50 text-green-800 border-green-200",
    icon: <EyeOff className="h-3.5 w-3.5" />,
    description: "Le contenu n'est plus visible publiquement.",
  },
  rejete: {
    label: "Signalement rejeté",
    tone: "bg-sable-100 text-foreground border-border",
    icon: <ShieldX className="h-3.5 w-3.5" />,
    description: "Notre équipe a estimé qu'il n'y avait pas matière à masquer.",
  },
};

export default async function MesSignalementsContenuPage() {
  const session = await requireAuth();
  const reports = await getContentReportsByUser(session.user.id);

  return (
    <PageContainer variant="wide">
      <Link
        href="/profil"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour au profil
      </Link>
      <PageHeader
        title="Mes signalements de contenu"
        description="Le suivi des contenus que vous avez signalés à l'équipe Dorloter. La modération est faite par un humain · on n'efface pas sur un seul signalement."
      />

      {reports.length === 0 ? (
        <EmptyState
          variant="illustrated"
          icon={<Flag className="h-9 w-9" />}
          title="Vous n'avez signalé aucun contenu"
          hint="Si vous croisez une fiche douteuse, un comportement inapproprié ou un faux refuge, le bouton « Signaler » est en bas de chaque fiche. Votre vigilance protège la communauté."
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

function ReportRow({ report }: { report: UserContentReport }) {
  const meta = STATUS_META[report.status];
  const reasonLabel = REASON_LABELS[report.reason] ?? report.reason;
  const contentTypeLabel = CONTENT_TYPE_LABELS[report.contentType] ?? "Contenu";

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {contentTypeLabel}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-foreground">
            {report.label}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Motif : <strong className="text-foreground">{reasonLabel}</strong>
          </p>
          {report.comment && (
            <p className="mt-2 whitespace-pre-line rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
              « {report.comment} »
            </p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            meta.tone
          )}
        >
          {meta.icon}
          {meta.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          Signalé le{" "}
          {new Date(report.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        {report.resolvedAt && (
          <span>
            · Traité le{" "}
            {new Date(report.resolvedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        <span className="ml-auto italic">{meta.description}</span>
      </div>

      {report.publicHref && (
        <Link
          href={report.publicHref}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-coral-600 hover:underline"
        >
          Voir le contenu
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </li>
  );
}
