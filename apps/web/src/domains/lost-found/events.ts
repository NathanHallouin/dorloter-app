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

/** Rappel 7j — signalement toujours actif. */
export interface ReportStaleEvent extends DomainEvent {
  type: "lost-found.report_stale";
  reportId: string;
  reportOwnerUserId: string;
  reportType: "perdu" | "trouve";
  petName: string | null;
  daysActive: number;
}
