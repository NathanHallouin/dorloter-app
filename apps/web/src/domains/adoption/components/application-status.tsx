import { cn } from "@shared/utils";

type AppStatus =
  | "envoyee"
  | "en_cours"
  | "acceptee"
  | "refusee"
  | "annulee";

const styles: Record<AppStatus, string> = {
  envoyee: "bg-sable-200 text-foreground",
  en_cours: "bg-coral-100 text-coral-800",
  acceptee: "bg-green-100 text-green-800",
  refusee: "bg-destructive/10 text-destructive",
  annulee: "bg-muted text-muted-foreground",
};

const labels: Record<AppStatus, string> = {
  envoyee: "Envoyée",
  en_cours: "En cours",
  acceptee: "Acceptée",
  refusee: "Refusée",
  annulee: "Annulée",
};

export function ApplicationStatusBadge({ status }: { status: AppStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
