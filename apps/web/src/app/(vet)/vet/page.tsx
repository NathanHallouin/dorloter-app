import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Eye,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { requireVeterinarian } from "@infra/auth/session";
import {
  getVeterinarianById,
  getRecentReportAccess,
} from "@veterinarians/public";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Tableau de bord · Vétérinaire",
};

export default async function VetHomePage() {
  const session = await requireVeterinarian();
  const vet = await getVeterinarianById(session.user.vetId);
  if (!vet) redirect("/dashboard");

  const recentAccess = await getRecentReportAccess(vet.id, 10);

  const completenessIssues: string[] = [];
  if (!vet.description) completenessIssues.push("Description manquante");
  if (!vet.address) completenessIssues.push("Adresse manquante");
  if (!vet.phone) completenessIssues.push("Téléphone manquant");
  if (!vet.email) completenessIssues.push("Email manquant");
  if (!vet.openingHours) completenessIssues.push("Horaires manquants");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Tableau de bord
        </p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">
          Bonjour {vet.name}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Voici l&apos;état de votre cabinet sur Dorloter.
        </p>
      </header>

      {/* Avertissement RGPD : permanent, posé une bonne fois pour toutes */}
      <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
        <div className="flex-1 text-sm text-teal-900">
          <p className="font-medium">
            Rappel : accès aux signalements tracé pour traçabilité RGPD.
          </p>
          <p className="mt-1 text-teal-800">
            Conservez les coordonnées d&apos;un signalement uniquement si vous
            avez un animal correspondant en consultation. Si vous recevez un
            animal trouvé non identifié, n&apos;oubliez pas la déclaration
            obligatoire à l&apos;
            <a
              href="https://www.i-cad.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:text-teal-700"
            >
              I-CAD
            </a>
            .
          </p>
        </div>
      </div>

      {/* Banner non-vérifié */}
      {!vet.isVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">
              Cabinet en attente de vérification
            </p>
            <p className="mt-1 text-sm text-amber-800">
              L&apos;équipe Dorloter doit valider votre SIRET et votre numéro
              d&apos;inscription à l&apos;Ordre des Vétérinaires avant que votre
              cabinet apparaisse dans l&apos;annuaire public. Vous pouvez déjà
              utiliser la recherche de signalements.
            </p>
            <Link
              href="/vet-profil"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline"
            >
              Compléter le profil
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Banner profil incomplet (même vérifié) */}
      {vet.isVerified && completenessIssues.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <div className="flex-1">
            <p className="font-medium text-teal-900">
              Quelques infos manquent sur votre fiche
            </p>
            <p className="mt-1 text-sm text-teal-800">
              Une fiche complète rassure les propriétaires.{" "}
              {completenessIssues.join(", ")}.
            </p>
            <Link
              href="/vet-profil"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-900 hover:underline"
            >
              Compléter
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Action principale */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Outil principal
        </h2>
        <Link
          href="/vet-recherche-signalements"
          className="flex items-start gap-4 rounded-xl border border-teal-300 bg-teal-50/40 p-5 transition-colors hover:border-teal-500"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white">
            <Search className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Recherche de signalements
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Un animal arrive sans identification ? Cherchez parmi les
              signalements perdus et trouvés dans un rayon de{" "}
              <strong>{vet.searchRadiusKm} km</strong> autour du cabinet.
            </p>
          </div>
          <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-teal-700" />
        </Link>
      </section>

      {/* Vue d'ensemble du cabinet */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Mon cabinet
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile
            label="Espèces prises en charge"
            value={[
              vet.acceptsCats && "Chats",
              vet.acceptsDogs && "Chiens",
              vet.acceptsNac && "NAC",
            ]
              .filter(Boolean)
              .join(", ") || "Non renseigné"}
          />
          <InfoTile
            label="Urgences 24/7"
            value={vet.emergencyAvailable ? "Oui" : "Non"}
            accent={vet.emergencyAvailable ? "teal" : "muted"}
          />
          <InfoTile
            label="Rayon recherche"
            value={`${vet.searchRadiusKm} km`}
          />
        </div>
      </section>

      {/* Audit RGPD : consultations récentes */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            Dernières consultations de signalements
          </h2>
          <span className="text-xs text-muted-foreground">
            Audit RGPD · 10 derniers
          </span>
        </header>
        {recentAccess.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune consultation pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {recentAccess.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Link
                  href={`/perdus-trouves/${log.reportId}`}
                  className="flex-1 truncate text-foreground hover:text-coral-600"
                  target="_blank"
                >
                  Signalement <code className="text-xs">{log.reportId.slice(0, 8)}</code>
                </Link>
                {log.revealedContact && (
                  <span className="inline-flex items-center rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-semibold text-coral-700">
                    Contact révélé
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.accessedAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Raccourcis */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Raccourcis
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction
            href={`/veterinaires/${vet.slug}`}
            icon={<ExternalLink className="h-4 w-4" />}
            label="Voir ma fiche publique"
            external
          />
          <QuickAction
            href="/vet-profil"
            icon={<Settings className="h-4 w-4" />}
            label="Gérer le profil"
          />
          <QuickAction
            href="https://annuaire-vet.ordre.veterinaire.fr"
            icon={<Stethoscope className="h-4 w-4" />}
            label="Annuaire officiel ONV"
            external
          />
        </div>
      </section>
    </div>
  );
}

function InfoTile({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "teal" | "muted";
}) {
  const styles: Record<typeof accent, string> = {
    default: "text-foreground",
    teal: "text-teal-700",
    muted: "text-muted-foreground",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-base font-semibold ${styles[accent]}`}>
        {value}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-teal-300 hover:bg-teal-50/50"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {external && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
    </Link>
  );
}
