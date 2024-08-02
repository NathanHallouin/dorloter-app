"use client";

import { Globe, Mail, Phone } from "lucide-react";
import { cn } from "@shared/utils";
import { recordPensionContact } from "../actions/contact";

interface Props {
  pensionId: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** Mode "sidebar" (lignes empilées avec icône) ou "stacked" (boutons larges). */
  variant?: "sidebar" | "stacked";
}

/**
 * Boutons de contact d'une pension. Chaque clic est tracké en arrière-plan
 * via `recordPensionContact` — pas de blocage UX, on n'attend pas le
 * retour serveur pour ouvrir le composeur / le mailto.
 *
 * Le numéro / email composés ne sont jamais envoyés au backend, juste
 * (pension, user, action). Tracking utile pour :
 *   - vérifier les avis (l'auteur d'un avis doit avoir contacté la pension)
 *   - alimenter un compteur d'engagement à terme
 */
export function PensionContactButtons({
  pensionId,
  phone,
  email,
  website,
  variant = "sidebar",
}: Props) {
  function track(action: "call" | "email" | "website") {
    void recordPensionContact(pensionId, action);
  }

  if (variant === "stacked") {
    return (
      <div className="grid gap-2">
        {phone && (
          <a
            href={`tel:${phone}`}
            onClick={() => track("call")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-coral-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:bg-coral-600"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            onClick={() => track("email")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-base font-semibold text-foreground hover:bg-muted"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("website")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-base font-semibold text-foreground hover:bg-muted"
          >
            <Globe className="h-4 w-4" />
            Site web
          </a>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5 text-sm">
      {phone && (
        <li>
          <a
            href={`tel:${phone}`}
            onClick={() => track("call")}
            className={cn(
              "flex items-center gap-2.5 text-foreground transition hover:text-coral-600"
            )}
          >
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{phone}</span>
          </a>
        </li>
      )}
      {email && (
        <li>
          <a
            href={`mailto:${email}`}
            onClick={() => track("email")}
            className="flex items-center gap-2.5 text-foreground transition hover:text-coral-600"
          >
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{email}</span>
          </a>
        </li>
      )}
      {website && (
        <li>
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("website")}
            className="flex items-center gap-2.5 text-foreground transition hover:text-coral-600"
          >
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {website.replace(/^https?:\/\//, "")}
            </span>
          </a>
        </li>
      )}
    </ul>
  );
}

/**
 * CTA mobile sticky en bas de la fiche pension. Affiche le bouton
 * d'action principal (téléphone si dispo, sinon email).
 */
export function PensionMobileCallCta({
  pensionId,
  phone,
  email,
}: {
  pensionId: string;
  phone: string | null;
  email: string | null;
}) {
  if (!phone && !email) return null;

  function track(action: "call" | "email") {
    void recordPensionContact(pensionId, action);
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-lg md:hidden dark:bg-background/95">
      {phone ? (
        <a
          href={`tel:${phone}`}
          onClick={() => track("call")}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-coral-500 px-6 py-3.5 text-base font-semibold text-white shadow-md"
        >
          <Phone className="h-4 w-4" />
          Appeler la pension
        </a>
      ) : email ? (
        <a
          href={`mailto:${email}`}
          onClick={() => track("email")}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-coral-500 px-6 py-3.5 text-base font-semibold text-white shadow-md"
        >
          <Mail className="h-4 w-4" />
          Écrire à la pension
        </a>
      ) : null}
    </div>
  );
}
