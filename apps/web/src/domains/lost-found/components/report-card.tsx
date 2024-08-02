import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, AlertCircle, HelpCircle } from "lucide-react";
import type { Report, ReportPhoto } from "@/types";

interface ReportCardProps {
  report: Report;
  primaryPhoto?: ReportPhoto | null;
  showStatus?: boolean;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

const TYPE_META = {
  perdu: {
    label: "Perdu",
    Icon: AlertCircle,
    stripe: "bg-prune-600",
    badge: "bg-prune-600 text-white",
    accent: "text-prune-700",
    tag: "Avis de recherche",
  },
  trouve: {
    label: "Trouvé",
    Icon: HelpCircle,
    stripe: "bg-lavande-600",
    badge: "bg-lavande-600 text-white",
    accent: "text-lavande-700",
    tag: "Cherche son foyer",
  },
} as const;

export function ReportCard({ report, primaryPhoto }: ReportCardProps) {
  const t = TYPE_META[report.type];
  const TypeIcon = t.Icon;

  const traits = [report.breed, report.color, sexShort(report.sex)]
    .filter(Boolean)
    .join(" · ");

  // Alt descriptif : on évite "" car la photo n'est pas purement décorative
  // (elle aide à reconnaître l'animal). On combine type + nom + traits.
  const photoAlt = [
    report.petName ?? (report.species === "chien" ? "Chien" : "Chat"),
    report.type === "perdu" ? "perdu" : "trouvé",
    [report.breed, report.color].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/perdus-trouves/${report.id}`}
      className="group relative flex overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sable-300 hover:shadow-md"
    >
      {/* Bande latérale typée */}
      <div className={`w-1.5 shrink-0 ${t.stripe}`} aria-hidden />

      {/* Photo carrée à gauche */}
      <div className="relative aspect-square w-28 shrink-0 bg-sable-100 sm:w-32">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto.url}
            alt={photoAlt}
            fill
            sizes="128px"
            className="object-cover"
            placeholder={primaryPhoto.blurDataUrl ? "blur" : "empty"}
            blurDataURL={primaryPhoto.blurDataUrl ?? undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <TypeIcon className={`h-8 w-8 opacity-40 ${t.accent}`} />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${t.badge}`}
          >
            <TypeIcon className="h-3 w-3" />
            {t.label}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t.tag}
          </span>
        </div>

        <h3 className="truncate text-base font-bold text-foreground">
          {report.petName ??
            (report.type === "perdu" ? "Chat sans nom connu" : "Chat recueilli")}
        </h3>

        {traits && (
          <p className="truncate text-sm text-foreground/80">{traits}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium">
            <Clock className="h-3 w-3" />
            {timeAgo(report.dateEvent)}
          </span>
          {report.address && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{report.address}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function sexShort(sex: "male" | "femelle" | "inconnu"): string | null {
  if (sex === "male") return "Mâle";
  if (sex === "femelle") return "Femelle";
  return null;
}
