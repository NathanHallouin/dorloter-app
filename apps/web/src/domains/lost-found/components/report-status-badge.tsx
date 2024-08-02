import { cn } from "@shared/utils";

type ReportStatus = "actif" | "resolu" | "expire";
type ReportType = "perdu" | "trouve";

const statusStyles: Record<ReportStatus, string> = {
  actif: "bg-coral-100 text-coral-800",
  resolu: "bg-green-100 text-green-800",
  expire: "bg-sable-200 text-foreground",
};

const statusLabels: Record<ReportStatus, string> = {
  actif: "Actif",
  resolu: "Résolu",
  expire: "Expiré",
};

const typeStyles: Record<ReportType, string> = {
  perdu: "bg-prune-100 text-prune-800",
  trouve: "bg-lavande-100 text-lavande-800",
};

const typeLabels: Record<ReportType, string> = {
  perdu: "Perdu",
  trouve: "Trouvé",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function ReportTypeBadge({ type }: { type: ReportType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        typeStyles[type]
      )}
    >
      {typeLabels[type]}
    </span>
  );
}
