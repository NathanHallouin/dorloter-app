/**
 * Listeners du domaine notifications.
 *
 * Écoute les events métier d'autres domaines et les transforme en
 * notifications utilisateur (persist DB + fanout email/push). C'est ici
 * que vit la connaissance « comment raconter ce fait à l'utilisateur ».
 * Les domaines émetteurs ignorent tout des canaux de notification.
 *
 * Règle de microcopy :
 *   - écrire comme un voisin bienveillant qui transmet une info utile
 *   - jamais d'emoji triomphal ni de point d'exclamation paniqué
 *   - le `body` complète sans répéter le `title`
 *   - inclure de la donnée concrète (nom, distance, score) plutôt que
 *     des formules vagues type "nouveauté importante"
 */

import { subscribe } from "@infra/event-bus";
import { emitNotification } from "./emit";
import type {
  PetPublishedEvent,
  ApplicationStatusChangedEvent,
} from "@adoption/events";
import type {
  ReportMatchesDiscoveredEvent,
  ReportStaleEvent,
} from "@lost-found/events";
import type { MessageSentEvent } from "@messaging/events";

function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// ─── adoption.pet_published — fanout aux followers du refuge ────────────────
subscribe<PetPublishedEvent>("adoption.pet_published", async (event) => {
  await Promise.all(
    event.followerIds.map((userId) =>
      emitNotification({
        userId,
        type: "new_cat_nearby",
        title: `${event.petName} cherche une famille`,
        body: `${event.shelterName} vient de publier un nouveau profil. Un coup d'œil pour voir s'il vous parle ?`,
        data: {
          petId: event.petId,
          petName: event.petName,
          shelterId: event.shelterId,
          shelterName: event.shelterName,
        },
        push: true,
      })
    )
  );
});

// ─── adoption.application_status_changed — notif adoptant ──────────────────
subscribe<ApplicationStatusChangedEvent>(
  "adoption.application_status_changed",
  async (event) => {
    const titles: Record<ApplicationStatusChangedEvent["status"], string> = {
      en_cours: `${event.petName} : votre candidature est en cours d'étude`,
      acceptee: `Bonne nouvelle 💛 votre candidature pour ${event.petName} est acceptée`,
      refusee: `${event.petName} : votre candidature n'a pas été retenue`,
    };
    const bodies: Record<
      ApplicationStatusChangedEvent["status"],
      string | undefined
    > = {
      en_cours:
        event.shelterNotes ??
        "Le refuge a bien reçu votre dossier. La prochaine étape arrive bientôt.",
      acceptee:
        event.shelterNotes ??
        "Le refuge va vous recontacter pour la rencontre. Préparez votre maison à un nouvel arrivant.",
      refusee:
        event.shelterNotes ??
        "Cette fois ça n'a pas collé — d'autres profils vous attendent dans le catalogue.",
    };

    await emitNotification({
      userId: event.applicantUserId,
      type: "application_update",
      title: titles[event.status],
      body: bodies[event.status],
      data: {
        applicationId: event.applicationId,
        petId: event.petId,
        petName: event.petName,
        status: event.status,
        shelterNotes: event.shelterNotes,
      },
    });
  }
);

// ─── lost-found.matches_discovered — notif auteur + tiers matchés ──────────
subscribe<ReportMatchesDiscoveredEvent>(
  "lost-found.matches_discovered",
  async (event) => {
    if (event.matches.length === 0) return;
    const best = event.matches[0]!;
    const bestDistance = formatDistance(best.distanceMeters);
    const bestScore = Math.round(best.score);

    // Notif à l'auteur du nouveau signalement.
    const isPerduOwner = event.reportType === "perdu";
    const titleOwner =
      event.matches.length === 1
        ? isPerduOwner
          ? `Une piste à ${bestDistance} pour votre disparition`
          : `Quelqu'un cherche peut-être votre trouvé — à ${bestDistance}`
        : isPerduOwner
          ? `${event.matches.length} pistes possibles près de chez vous`
          : `${event.matches.length} familles cherchent un animal correspondant`;

    const bodyOwner =
      event.matches.length === 1
        ? `Score ${bestScore}/100 — vérifiez la fiche, prenez contact si ça ressemble.`
        : `La plus probable : à ${bestDistance}, score ${bestScore}/100.`;

    await emitNotification({
      userId: event.reportOwnerUserId,
      type: "match_found",
      title: titleOwner,
      body: bodyOwner,
      data: {
        reportId: event.reportId,
        matchCount: event.matches.length,
        bestScore: best.score,
        bestDistanceKm: best.distanceMeters / 1000,
      },
    });

    // Notifs aux propriétaires des signalements en face (hors self-match).
    for (const m of event.matches) {
      if (m.reportOwnerUserId === event.reportOwnerUserId) continue;
      const otherDistance = formatDistance(m.distanceMeters);
      const otherScore = Math.round(m.score);
      const counterpartLabel =
        event.reportType === "perdu" ? "perdu" : "trouvé";

      await emitNotification({
        userId: m.reportOwnerUserId,
        type: "match_found",
        title: `Un signalement « ${counterpartLabel} » à ${otherDistance} de votre annonce`,
        body: `Score ${otherScore}/100 — ouvrez la fiche pour comparer les détails et contacter si ça correspond.`,
        data: {
          reportId: m.reportId,
          matchedReportId: event.reportId,
          matchCount: 1,
          bestScore: m.score,
          bestDistanceKm: m.distanceMeters / 1000,
        },
      });
    }
  }
);

// ─── lost-found.report_stale — rappel 7j ───────────────────────────────────
subscribe<ReportStaleEvent>("lost-found.report_stale", async (event) => {
  const isPerdu = event.reportType === "perdu";
  const subject =
    event.petName ?? (isPerdu ? "votre animal" : "l'animal trouvé");

  await emitNotification({
    userId: event.reportOwnerUserId,
    type: "report_nearby",
    title: isPerdu
      ? `${event.daysActive} jours sans nouvelle de ${subject}`
      : `${subject} attend toujours sa famille — ${event.daysActive} jours`,
    body: isPerdu
      ? "Si vous l'avez retrouvé·e, marquez l'annonce comme résolue. Sinon, complétez la fiche pour augmenter les chances."
      : "Si la famille s'est manifestée, marquez l'annonce comme résolue. Sinon, ajoutez des détails pour aider la mise en relation.",
    data: {
      reportId: event.reportId,
      reportType: event.reportType,
      petName: event.petName,
      daysActive: event.daysActive,
    },
    email: true,
    push: true,
  });
});

// ─── messaging.message_sent — notif + push aux destinataires offline ───────
subscribe<MessageSentEvent>("messaging.message_sent", async (event) => {
  for (const r of event.recipients) {
    const url =
      r.side === "user"
        ? `/messages/${event.conversationId}`
        : `/shelter-messages/${event.conversationId}`;

    const subject = event.petName ? ` à propos de ${event.petName}` : "";
    const title = event.isFirstMessage
      ? `${event.senderName} vous écrit${subject}`
      : `${event.senderName} a répondu${subject}`;

    await emitNotification({
      userId: r.userId,
      type: "new_message",
      title,
      body: event.preview,
      data: {
        url,
        conversationId: event.conversationId,
        senderName: event.senderName,
        preview: event.preview,
        petName: event.petName,
      },
      // push forcé pour messaging (hors FANOUT_AUTO_TYPES), email seulement
      // sur le premier message de la conversation.
      push: true,
      email: event.isFirstMessage,
    });
  }
});
