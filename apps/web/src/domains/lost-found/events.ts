import type { DomainEvent } from "@infra/event-bus";

/**
 * Events publiés par le domaine lost-found.
 *
 * Convention de nommage : `<domaine>.<fait>` au passé — on publie ce qui
 * VIENT de se passer, pas des intentions.
 */

export interface ReportResolvedEvent extends DomainEvent {
  type: "lost-found.report_resolved";
  reportId: string;
  /** ID du user qui a déclenché la résolution (auteur du report ou confirmant du match). */
  resolvedByUserId: string;
  /** Déclencheur de la résolution. */
  trigger: "manual" | "match_confirmed";
  /** Si trigger = "match_confirmed", l'ID du match associé. */
  matchId?: string;
  resolvedAt: Date;
}

export interface ReportMatchesDiscoveredEvent extends DomainEvent {
  type: "lost-found.matches_discovered";
  /** Le report qui vient d'être créé et pour lequel des correspondances ont été trouvées. */
  reportId: string;
  reportOwnerUserId: string;
  reportType: "perdu" | "trouve";
  /** Correspondances triées par score décroissant (best first). */
  matches: Array<{
    reportId: string;
    reportOwnerUserId: string;
    score: number;
    distanceMeters: number;
  }>;
}

/**
 * Émis juste après la création d'un signalement (perdu ou trouvé), avec
 * tous les éléments dont les listeners ont besoin pour notifier les
 * intervenants externes (vétos du secteur notamment). Les coordonnées
 * sont incluses pour permettre les requêtes spatiales sans recharger.
 */
export interface ReportPublishedEvent extends DomainEvent {
  type: "lost-found.report_published";
  reportId: string;
  reportType: "perdu" | "trouve";
  species: "chat" | "chien";
  reportOwnerUserId: string;
  petName: string | null;
  /** Latitude WGS84 du signalement. */
  lat: number;
  /** Longitude WGS84 du signalement. */
  lng: number;
}

/** Rappel 7j · signalement toujours actif. */
export interface ReportStaleEvent extends DomainEvent {
  type: "lost-found.report_stale";
  reportId: string;
  reportOwnerUserId: string;
  reportType: "perdu" | "trouve";
  petName: string | null;
  daysActive: number;
}
