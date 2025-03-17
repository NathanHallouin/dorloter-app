import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Dorloter <noreply@dorloter.fr>";

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envoie un email via Resend. Sans clé API, log un warning et continue
 * (return success) au lieu de planter — l'inscription, le reset password
 * et les notifs continuent de fonctionner côté UI, juste sans email.
 *
 * Pour activer l'envoi réel, set `RESEND_API_KEY` dans l'environnement.
 * Sur Vercel : Project Settings → Environment Variables.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY absente — email "${subject}" pour <${to}> non envoyé. ` +
        `Texte loggué uniquement.`
    );
    if (text) console.log(text);
    return { success: true };
  }

  const result = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
    text,
  });

  if (result.error) {
    console.error("Erreur envoi email :", result.error);
    return { success: false, error: result.error.message };
  }

  return { success: true };
}

// ─── Templates ─────────────────────────────────────────────────────────────

export function verificationEmailTemplate(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Un dernier clic pour activer le compte · Dorloter",
    text: `Bienvenue.

Un clic sur ce lien pour confirmer votre adresse :
${url}

Le lien expire dans une heure. Si ce n'est pas vous, ignorez simplement ce mail.

· Dorloter`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2b1810">
<h1 style="font-size:22px;margin:0 0 16px">Bienvenue.</h1>
<p>Un clic pour confirmer votre adresse et c&apos;est parti.</p>
<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#e8634d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Confirmer mon email</a></p>
<p style="color:#6b5347;font-size:14px">Ou ce lien dans votre navigateur :<br><a href="${url}" style="color:#e8634d;word-break:break-all">${url}</a></p>
<p style="color:#6b5347;font-size:14px;margin-top:24px">Lien valable une heure. Si vous n&apos;êtes à l&apos;origine de rien, ignorez ce message.</p>
</div>`,
  };
}

export function resetPasswordEmailTemplate(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Nouveau mot de passe · Dorloter",
    text: `Pour choisir un nouveau mot de passe, cliquez sur ce lien :
${url}

Lien valable une heure. Si la demande ne vient pas de vous, ignorez ce mail · rien ne change.

· Dorloter`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2b1810">
<h1 style="font-size:22px;margin:0 0 16px">Nouveau mot de passe</h1>
<p>Un clic pour en choisir un nouveau :</p>
<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#e8634d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Choisir un nouveau mot de passe</a></p>
<p style="color:#6b5347;font-size:14px">Ou ce lien dans votre navigateur :<br><a href="${url}" style="color:#e8634d;word-break:break-all">${url}</a></p>
<p style="color:#6b5347;font-size:14px;margin-top:24px">Lien valable une heure. Si la demande ne vient pas de vous, ignorez · rien ne change.</p>
</div>`,
  };
}

// ─── Templates notifications ───────────────────────────────────────────────

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function card(title: string, body: string, ctaLabel: string, ctaPath: string): string {
  const fullUrl = `${baseUrl}${ctaPath}`;
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2b1810">
<h1 style="font-size:22px;margin:0 0 16px">${title}</h1>
<p style="white-space:pre-wrap">${body}</p>
<p style="margin:24px 0"><a href="${fullUrl}" style="display:inline-block;background:#e8634d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${ctaLabel}</a></p>
<p style="color:#6b5347;font-size:12px;margin-top:32px;border-top:1px solid #e6e0d5;padding-top:16px">Vous recevez cet email car vous avez un compte Dorloter. Retrouvez vos préférences sur <a href="${baseUrl}/profil" style="color:#e8634d">votre profil</a>.</p>
</div>`;
}

export function applicationUpdateEmailTemplate(params: {
  petName: string;
  status: "en_cours" | "acceptee" | "refusee";
  shelterNotes: string | null;
}): { subject: string; html: string; text: string } {
  const { petName, status, shelterNotes } = params;
  const verb = {
    en_cours: "est en cours d'examen",
    acceptee: "a été acceptée 🎉",
    refusee: "n'a pas été retenue",
  }[status];
  const title = `Candidature pour ${petName} : ${verb}`;
  const noteBlock = shelterNotes
    ? `\n\nMessage du refuge :\n${shelterNotes}`
    : "";
  const text = `${title}${noteBlock}\n\nVoir vos candidatures : ${baseUrl}/candidatures`;
  const bodyHtml =
    (shelterNotes ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #e8634d;background:#fff5f2;color:#52483e">${shelterNotes.replace(/\n/g, "<br>")}</blockquote>` : "") +
    `Vous pouvez suivre le statut de votre candidature à tout moment.`;
  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(title, bodyHtml, "Voir ma candidature", "/candidatures"),
  };
}

export function shelterInvitationEmailTemplate(params: {
  shelterName: string;
  invitedBy: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const { shelterName, invitedBy, url } = params;
  const title = `${invitedBy} vous invite à gérer « ${shelterName} »`;
  return {
    subject: `${title} · Dorloter`,
    text: `${title}

Un clic pour rejoindre l'équipe :
${url}

Ce lien expire dans 7 jours.

· Dorloter`,
    html: card(
      title,
      `En acceptant, vous pourrez gérer les chats, répondre aux candidatures et voir les stats du refuge.<br><br>Le lien est valable 7 jours.`,
      "Rejoindre le refuge",
      url.replace(baseUrl, "")
    ),
  };
}

export function matchFoundEmailTemplate(params: {
  reportId: string;
  matchCount: number;
  bestScore: number;
  bestDistanceKm: number;
}): { subject: string; html: string; text: string } {
  const { reportId, matchCount, bestScore, bestDistanceKm } = params;
  const plural = matchCount > 1;
  const title = plural
    ? `${matchCount} correspondances trouvées pour votre signalement`
    : `Une correspondance pour votre signalement`;
  const detail = `Meilleur match : score ${Math.round(bestScore)}/100 à ${bestDistanceKm.toFixed(1)} km.`;
  return {
    subject: `${title} · Dorloter`,
    text: `${title}\n${detail}\n\nVoir le détail : ${baseUrl}/perdus-trouves/${reportId}`,
    html: card(
      title,
      detail +
        `<br><br>Nous vous recommandons d'examiner rapidement chaque correspondance et de confirmer ou rejeter.`,
      "Voir les correspondances",
      `/perdus-trouves/${reportId}`
    ),
  };
}

/**
 * Rappel envoyé à l'auteur d'un signalement actif depuis 7 jours sans
 * résolution. Objectif : l'aider à augmenter ses chances (ajouter des photos,
 * partager sur les réseaux, résoudre si le chat a été retrouvé hors Dorloter).
 */
export function staleReportReminderEmailTemplate(params: {
  reportId: string;
  type: "perdu" | "trouve";
  petName: string | null;
  daysActive: number;
}): { subject: string; html: string; text: string } {
  const { reportId, type, petName, daysActive } = params;
  const who = petName ?? (type === "perdu" ? "votre chat" : "ce chat");
  const title =
    type === "perdu"
      ? `Votre annonce pour ${who} est active depuis ${daysActive} jours`
      : `Le animal trouvé attend toujours sa famille (${daysActive} jours)`;
  const tips =
    type === "perdu"
      ? [
          "Ajoutez des photos récentes si ce n'est pas fait",
          "Partagez l'annonce dans les groupes Facebook de votre ville",
          "Contactez les vétérinaires et refuges du coin",
          "Si vous l'avez retrouvé, pensez à clôturer l'annonce pour libérer les alertes",
        ]
      : [
          "Vérifiez les annonces « animal perdu » proches (Dorloter vous en suggère)",
          "Partagez sur les réseaux sociaux locaux",
          "Si vous avez rendu le chat, pensez à clôturer l'annonce",
        ];
  const tipsHtml = tips
    .map((t) => `<li style="margin:4px 0">${t}</li>`)
    .join("");
  const text = `${title}\n\nQuelques pistes pour maximiser vos chances :\n- ${tips.join("\n- ")}\n\nVoir l'annonce : ${baseUrl}/perdus-trouves/${reportId}`;
  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `Quelques pistes pour maximiser les chances de retrouvailles :<ul>${tipsHtml}</ul>`,
      "Voir mon annonce",
      `/perdus-trouves/${reportId}`
    ),
  };
}

/**
 * Notification de 1er message sur une conversation. Pour les messages
 * suivants, on se base uniquement sur push + in-app pour éviter de spammer.
 */
export function newMessageEmailTemplate(params: {
  senderName: string;
  preview: string;
  conversationUrl: string;
  petName?: string | null;
}): { subject: string; html: string; text: string } {
  const { senderName, preview, conversationUrl, petName } = params;
  const title = petName
    ? `Nouveau message de ${senderName} à propos de ${petName}`
    : `Nouveau message de ${senderName}`;
  const text = `${title}\n\n« ${preview} »\n\nRépondre : ${baseUrl}${conversationUrl}`;
  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #8b72c2;background:#f6f4fb;color:#52483e">${preview.replace(/\n/g, "<br>")}</blockquote>Vous recevez cet email parce que c'est le premier message sur cette conversation. Les messages suivants arrivent uniquement par notification push et dans votre boîte Dorloter.`,
      "Répondre",
      conversationUrl
    ),
  };
}

// ─── Suivi post-adoption ───────────────────────────────────────────────────

/**
 * J+15 : email d'adaptation. On prend des nouvelles, on rassure, on rappelle
 * que le refuge reste joignable en cas de souci comportemental ou médical.
 */
export function followupJ15EmailTemplate(params: {
  userName: string;
  petName: string;
  shelterName: string;
  shelterEmail: string | null;
}): { subject: string; html: string; text: string } {
  const { userName, petName, shelterName, shelterEmail } = params;
  const firstName = userName.split(" ")[0] || userName;
  const title = `Comment se passe l'adaptation de ${petName} ?`;
  const contactBlock = shelterEmail
    ? `Une question, un doute, un souci ? Le refuge ${shelterName} reste joignable : <a href="mailto:${shelterEmail}" style="color:#e8634d">${shelterEmail}</a>.`
    : `Une question, un doute ? Le refuge ${shelterName} reste votre meilleur interlocuteur.`;

  const text = `Bonjour ${firstName},

Cela fait deux semaines que ${petName} est rentré·e chez vous. On voulait prendre de ses nouvelles, et des vôtres.

L'adaptation, c'est un marathon : les premiers jours, l'animal explore, se cache, se teste. Les premières semaines, il commence à reconnaître son territoire, sa routine, ses humains. Comptez 3 semaines pour la décompression, 3 mois pour s'installer, 3 ans pour partager une vie totalement intégrée.

${shelterEmail ? `Une question ? Le refuge reste joignable : ${shelterEmail}.` : `Une question ? Le refuge ${shelterName} reste votre meilleur interlocuteur.`}

Bonne continuation,
L'équipe Dorloter`;

  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `Bonjour ${firstName},<br><br>Cela fait deux semaines que ${petName} est rentré·e chez vous. On voulait prendre de ses nouvelles.<br><br>L'adaptation, c'est un marathon : <strong>3 semaines</strong> pour la décompression, <strong>3 mois</strong> pour s'installer, <strong>3 ans</strong> pour partager une vie totalement intégrée.<br><br>${contactBlock}`,
      "Voir mon espace",
      "/dashboard"
    ),
  };
}

/**
 * J+90 : invitation à publier un témoignage public sur Dorloter. Permet
 * de nourrir la home, redonner espoir aux autres adoptants potentiels.
 */
export function followupJ90EmailTemplate(params: {
  userName: string;
  petName: string;
  petId: string;
}): { subject: string; html: string; text: string } {
  const { userName, petName, petId } = params;
  const firstName = userName.split(" ")[0] || userName;
  const title = `Et si vous partagiez l'histoire de ${petName} ?`;

  const text = `Bonjour ${firstName},

Trois mois que ${petName} a rejoint votre foyer. C'est le moment idéal pour partager votre expérience : votre témoignage motive les futurs adoptants, donne de l'élan aux refuges et nourrit toute la communauté Dorloter.

Cela ne prend que quelques minutes. Une photo, quelques lignes sur votre adaptation, et c'est en ligne (modéré par nos soins).

Publier votre témoignage : ${process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr"}/adopter/${petId}#temoignage

Merci pour ce que vous faites,
L'équipe Dorloter`;

  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `Bonjour ${firstName},<br><br>Trois mois que ${petName} a rejoint votre foyer. C'est le moment idéal pour partager votre expérience.<br><br>Un témoignage, c'est :<br>· un coup de pouce aux futurs adoptants<br>· de la fierté pour le refuge<br>· de la lumière pour toute la communauté<br><br>Quelques lignes, une photo, et c'est en ligne.`,
      "Partager mon témoignage",
      `/adopter/${petId}#temoignage`
    ),
  };
}

/**
 * J+365 : email anniversaire de l'adoption + invitation à parrainer un
 * autre animal du même refuge.
 */
export function followupJ365EmailTemplate(params: {
  userName: string;
  petName: string;
  shelterName: string;
}): { subject: string; html: string; text: string } {
  const { userName, petName, shelterName } = params;
  const firstName = userName.split(" ")[0] || userName;
  const title = `Un an avec ${petName} !`;

  const text = `Bonjour ${firstName},

C'est l'anniversaire ! Voilà un an que ${petName} partage votre quotidien. On espère que vous avez plein d'aventures à raconter.

Si vous voulez prolonger l'élan, sachez que ${shelterName} accueille toujours d'autres animaux qui attendent une famille. Adoption, parrainage à distance, partage de fiches : chaque geste compte.

Découvrir les nouveaux profils : ${process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr"}/refuges

Merci pour votre engagement,
L'équipe Dorloter`;

  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `Bonjour ${firstName},<br><br>Voilà <strong>un an</strong> que ${petName} partage votre quotidien. On espère que vous avez plein d'aventures à raconter.<br><br>Si vous voulez prolonger l'élan : ${shelterName} accueille toujours d'autres animaux. Adoption, parrainage, partage de fiches : chaque geste compte.`,
      "Découvrir les nouveaux profils",
      "/refuges"
    ),
  };
}

// ─── Transferts inter-refuges ─────────────────────────────────────────────

/**
 * Email envoyé aux admins du refuge destinataire à l'initiation d'un
 * transfert. Le destinataire peut accepter ou refuser depuis sa page
 * `/shelter-transferts`.
 */
export function petTransferRequestedEmailTemplate(params: {
  userName: string;
  petName: string;
  petSpecies: "chat" | "chien";
  fromShelterName: string;
  requestedByName: string;
  message: string | null;
  transferId: string;
}): { subject: string; html: string; text: string } {
  const {
    userName,
    petName,
    petSpecies,
    fromShelterName,
    requestedByName,
    message,
    transferId,
  } = params;
  const firstName = userName.split(" ")[0] || userName;
  const speciesLabel = petSpecies === "chat" ? "chat" : "chien";
  const subject = `Demande de transfert : ${petName} (${speciesLabel}) depuis ${fromShelterName}`;
  const messageBlock = message
    ? `\n\nMessage du refuge :\n« ${message} »`
    : "";

  const text = `Bonjour ${firstName},

${requestedByName} (équipe ${fromShelterName}) sollicite votre refuge pour la prise en charge de ${petName} (${speciesLabel}).${messageBlock}

Acceptez ou refusez cette demande depuis votre tableau de bord :
${process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr"}/shelter-transferts

À l'acceptation, ${petName} bascule automatiquement sous la responsabilité de votre refuge sur Dorloter.

Bonne réception,
L'équipe Dorloter`;

  const safeMessage = message
    ? message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")
    : "";

  return {
    subject: `${subject} · Dorloter`,
    text,
    html: card(
      subject,
      `Bonjour ${firstName},<br><br><strong>${requestedByName}</strong> (équipe ${fromShelterName}) sollicite votre refuge pour la prise en charge de <strong>${petName}</strong> (${speciesLabel}).${
        message
          ? `<br><br><blockquote style="margin:12px 0;padding:8px 16px;border-left:3px solid #e8634d;background:#fff5f2;color:#52483e">${safeMessage}</blockquote>`
          : ""
      }<br>À l'acceptation, ${petName} basculera automatiquement sous la responsabilité de votre refuge.`,
      "Traiter cette demande",
      `/shelter-transferts#${transferId}`
    ),
  };
}

/**
 * Email envoyé à l'initiateur quand le refuge destinataire prend une
 * décision (accept/refuse).
 */
export function petTransferDecidedEmailTemplate(params: {
  userName: string;
  petName: string;
  toShelterName: string;
  decided: "accepte" | "refuse";
  decisionNote: string | null;
}): { subject: string; html: string; text: string } {
  const { userName, petName, toShelterName, decided, decisionNote } = params;
  const firstName = userName.split(" ")[0] || userName;
  const subject =
    decided === "accepte"
      ? `Transfert de ${petName} accepté par ${toShelterName}`
      : `Transfert de ${petName} refusé par ${toShelterName}`;
  const intro =
    decided === "accepte"
      ? `${toShelterName} a accepté le transfert de ${petName}. La fiche est maintenant sous leur responsabilité sur Dorloter.`
      : `${toShelterName} a refusé le transfert de ${petName}. La fiche reste sous votre responsabilité.`;
  const noteBlock = decisionNote
    ? `\n\nNote du refuge :\n« ${decisionNote} »`
    : "";
  const safeNote = decisionNote
    ? decisionNote
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\n/g, "<br>")
    : "";

  return {
    subject: `${subject} · Dorloter`,
    text: `Bonjour ${firstName},

${intro}${noteBlock}

· Dorloter`,
    html: card(
      subject,
      `Bonjour ${firstName},<br><br>${intro}${
        decisionNote
          ? `<br><br><blockquote style="margin:12px 0;padding:8px 16px;border-left:3px solid #e8634d;background:#fff5f2;color:#52483e">${safeNote}</blockquote>`
          : ""
      }`,
      "Voir mes transferts",
      "/shelter-transferts"
    ),
  };
}

// ─── Newsletter refuge ────────────────────────────────────────────────────

/**
 * Email envoyé aux followers d'un refuge quand l'équipe publie une
 * newsletter (nouvel arrivage, urgence FA, appel aux dons, événement,
 * général). Le `body` est texte brut — converti en HTML basique en
 * remplaçant les sauts de ligne par `<br>` (pas de Markdown rendering
 * en V1 pour rester déterministe).
 */
export function shelterNewsletterEmailTemplate(params: {
  userName: string;
  shelterName: string;
  shelterSlug: string;
  subject: string;
  body: string;
}): { subject: string; html: string; text: string } {
  const { userName, shelterName, shelterSlug, subject, body } = params;
  const firstName = userName.split(" ")[0] || userName;

  const text = `Bonjour ${firstName},

${shelterName} vient de publier une nouvelle :

${body}

Voir la fiche du refuge : ${process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr"}/refuges/${shelterSlug}

Vous recevez cet email parce que vous suivez ${shelterName} sur Dorloter. Pour ne plus recevoir leurs nouvelles, retirez-le de vos refuges suivis depuis votre profil.

· Dorloter`;

  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return {
    subject: `${subject} · ${shelterName}`,
    text,
    html: card(
      subject,
      `Bonjour ${firstName},<br><br><strong>${shelterName}</strong> vient de publier une nouvelle :<br><br><div style="border-left:3px solid #e8634d;padding:8px 16px;background:#fff5f2;color:#2b1810">${safeBody}</div>`,
      "Voir le refuge",
      `/refuges/${shelterSlug}`
    ),
  };
}

// ─── Alerte signalement aux cabinets vétos du secteur ─────────────────────

/**
 * Email envoyé à un compte vétérinaire admin quand un signalement
 * perdu/trouvé est créé dans son rayon de recherche configuré.
 */
export function vetReportAlertEmailTemplate(params: {
  userName: string;
  vetName: string;
  vetSlug: string;
  reportId: string;
  reportType: "perdu" | "trouve";
  species: "chat" | "chien";
  petName: string | null;
  distanceMeters: number;
}): { subject: string; html: string; text: string } {
  const {
    userName,
    vetName,
    reportType,
    species,
    petName,
    distanceMeters,
  } = params;
  const firstName = userName.split(" ")[0] || userName;
  const speciesLabel = species === "chat" ? "chat" : "chien";
  const typeLabel = reportType === "perdu" ? "perdu" : "trouvé";
  const distanceKm = (distanceMeters / 1000).toFixed(1);
  const titleAnimal = petName
    ? `${petName} (${speciesLabel} ${typeLabel})`
    : `${speciesLabel} ${typeLabel}`;
  const title = `Alerte signalement à ${distanceKm} km de ${vetName}`;

  const text = `Bonjour ${firstName},

Un nouveau signalement vient d'être publié à ${distanceKm} km de votre cabinet ${vetName} : ${titleAnimal}.

Pourquoi ce mail : votre cabinet est référencé sur Dorloter avec un rayon d'écoute. Les signalements de votre périmètre vous parviennent automatiquement. Vous pouvez les consulter, contacter le propriétaire ou signaler une suspicion d'identification chez vous.

Voir la fiche : ${process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr"}/perdus-trouves/${params.reportId}

Si vous ne souhaitez plus recevoir ces alertes, ajustez votre rayon de recherche dans votre profil cabinet.

· Dorloter`;

  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `Bonjour ${firstName},<br><br>Un nouveau signalement vient d'être publié à <strong>${distanceKm} km</strong> de votre cabinet <strong>${vetName}</strong> :<br><br><strong>${titleAnimal}</strong><br><br>Pourquoi ce mail : votre cabinet est référencé sur Dorloter avec un rayon d'écoute. Les signalements de votre périmètre vous parviennent automatiquement.<br><br><span style="color:#6b5e4f;font-size:12px">Si vous ne souhaitez plus recevoir ces alertes, ajustez votre rayon de recherche dans votre profil cabinet.</span>`,
      "Voir la fiche signalement",
      `/perdus-trouves/${params.reportId}`
    ),
  };
}

// ─── RDV visite refuge ─────────────────────────────────────────────────────

function formatDateTimeFR(d: Date): string {
  const date = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} à ${time}`;
}

/**
 * Confirmation d'un RDV de visite par le refuge.
 */
export function visitBookingConfirmedEmailTemplate(params: {
  userName: string;
  petName: string | null;
  shelterName: string;
  shelterAddress: string | null;
  scheduledFor: Date;
}): { subject: string; html: string; text: string } {
  const { userName, petName, shelterName, shelterAddress, scheduledFor } =
    params;
  const firstName = userName.split(" ")[0] || userName;
  const datetime = formatDateTimeFR(scheduledFor);
  const subject = petName
    ? `Visite confirmée pour ${petName}`
    : `Visite confirmée chez ${shelterName}`;

  const text = `Bonjour ${firstName},

${shelterName} confirme votre rendez-vous de visite${petName ? ` pour ${petName}` : ""} le ${datetime}.

${shelterAddress ? `Lieu : ${shelterAddress}\n\n` : ""}À noter :
- Prévoyez environ 30 minutes.
- Apportez une pièce d'identité.
- Posez toutes vos questions.
- En cas d'empêchement, prévenez le refuge dès que possible.

À bientôt,
L'équipe Dorloter`;

  return {
    subject: `${subject} · Dorloter`,
    text,
    html: card(
      subject,
      `Bonjour ${firstName},<br><br>${shelterName} confirme votre rendez-vous${petName ? ` pour <strong>${petName}</strong>` : ""} le <strong>${datetime}</strong>.${shelterAddress ? `<br><br>Lieu : ${shelterAddress}` : ""}<br><br>À prévoir : environ 30 min, une pièce d'identité, vos questions. En cas d'empêchement, prévenez le refuge.`,
      "Voir mes RDV",
      "/dashboard?tab=rdv"
    ),
  };
}

/**
 * Refus d'un RDV par le refuge.
 */
export function visitBookingRefusedEmailTemplate(params: {
  userName: string;
  petName: string | null;
  shelterName: string;
  scheduledFor: Date;
}): { subject: string; html: string; text: string } {
  const { userName, petName, shelterName, scheduledFor } = params;
  const firstName = userName.split(" ")[0] || userName;
  const datetime = formatDateTimeFR(scheduledFor);
  const subject = `Créneau du ${datetime.split(" à ")[0]} non disponible`;

  const text = `Bonjour ${firstName},

${shelterName} n'est malheureusement pas disponible le ${datetime}.

Pas d'inquiétude, vous pouvez choisir un autre créneau parmi ceux ouverts par le refuge${petName ? `, ou contacter ${shelterName} directement pour parler de ${petName}` : ""}.

Bonne continuation,
L'équipe Dorloter`;

  return {
    subject: `${subject} · Dorloter`,
    text,
    html: card(
      subject,
      `Bonjour ${firstName},<br><br>${shelterName} n'est malheureusement pas disponible le <strong>${datetime}</strong>.<br><br>Pas d'inquiétude, vous pouvez choisir un autre créneau parmi ceux ouverts${petName ? `, ou contacter ${shelterName} directement à propos de ${petName}` : ""}.`,
      "Choisir un autre créneau",
      petName ? `/adopter` : "/refuges"
    ),
  };
}

/**
 * Rappel J-1 d'un RDV confirmé.
 */
export function visitBookingReminderEmailTemplate(params: {
  userName: string;
  petName: string | null;
  shelterName: string;
  shelterAddress: string | null;
  scheduledFor: Date;
}): { subject: string; html: string; text: string } {
  const { userName, petName, shelterName, shelterAddress, scheduledFor } =
    params;
  const firstName = userName.split(" ")[0] || userName;
  const datetime = formatDateTimeFR(scheduledFor);
  const subject = petName
    ? `Rappel : visite pour ${petName} demain`
    : `Rappel : visite chez ${shelterName} demain`;

  const text = `Bonjour ${firstName},

Petit rappel : votre rendez-vous chez ${shelterName}${petName ? ` pour ${petName}` : ""} est demain, ${datetime}.

${shelterAddress ? `Lieu : ${shelterAddress}\n\n` : ""}Bonne visite,
L'équipe Dorloter

PS : un empêchement de dernière minute ? Prévenez le refuge directement par téléphone.`;

  return {
    subject: `${subject} · Dorloter`,
    text,
    html: card(
      subject,
      `Bonjour ${firstName},<br><br>Petit rappel : votre rendez-vous chez <strong>${shelterName}</strong>${petName ? ` pour <strong>${petName}</strong>` : ""} est demain, <strong>${datetime}</strong>.${shelterAddress ? `<br><br>Lieu : ${shelterAddress}` : ""}<br><br>Bonne visite. En cas d'empêchement, prévenez le refuge directement.`,
      "Voir mes RDV",
      "/dashboard?tab=rdv"
    ),
  };
}

/**
 * Digest d'une recherche sauvegardée (alertes adoption ou perdus/trouvés).
 * Pas plus de 6 items par email — le reste est sur le site.
 */
export function savedSearchDigestEmailTemplate(params: {
  userName: string;
  searchName: string;
  kind: "adoption" | "lost-found";
  items: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    photoUrl: string | null;
    href: string;
  }>;
  baseUrl: string;
}): { subject: string; html: string; text: string } {
  const { userName, searchName, kind, items, baseUrl } = params;
  const firstName = userName.split(" ")[0] || userName;
  const plural = items.length > 1;
  const noun =
    kind === "adoption"
      ? plural
        ? "nouveaux profils"
        : "nouveau profil"
      : plural
        ? "nouveaux signalements"
        : "nouveau signalement";

  const title = `${items.length} ${noun} pour « ${searchName} »`;

  const itemsHtml = items
    .map((c) => {
      const photo = c.photoUrl
        ? `<img src="${c.photoUrl}" alt="" style="width:72px;height:72px;border-radius:12px;object-fit:cover;vertical-align:middle;margin-right:12px">`
        : `<div style="display:inline-block;width:72px;height:72px;border-radius:12px;background:#f3f0ea;vertical-align:middle;margin-right:12px"></div>`;
      const subtitle = c.subtitle
        ? `<span style="color:#6b5e4f;font-size:13px">${c.subtitle}</span>`
        : "";
      return `<a href="${baseUrl}${c.href}" style="display:block;padding:12px 0;border-bottom:1px solid #e6e0d5;color:#2b1810;text-decoration:none">
${photo}<span style="display:inline-block;vertical-align:middle">
<strong style="display:block;margin-bottom:2px">${c.title}</strong>
${subtitle}
</span></a>`;
    })
    .join("");

  const itemsText = items
    .map(
      (c) =>
        `· ${c.title}${c.subtitle ? ` (${c.subtitle})` : ""}\n  ${baseUrl}${c.href}`
    )
    .join("\n");

  const ctaPath = kind === "adoption" ? "/profil/recherches" : "/profil/recherches";
  const hello = firstName ? `Bonjour ${firstName},` : "Bonjour,";

  const text = `${hello}

${title} :

${itemsText}

Gérer cette alerte : ${baseUrl}/profil/recherches

· Dorloter`;

  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `${hello}<br><br>Voici les ${noun} qui matchent vos critères depuis votre dernier passage :${itemsHtml}`,
      "Gérer mes alertes",
      ctaPath
    ),
  };
}

/**
 * Digest hebdomadaire des nouveaux animaux à adopter dans le rayon de
 * notification de l'utilisateur.
 */
export function weeklyDigestEmailTemplate(params: {
  pets: Array<{
    id: string;
    name: string;
    species?: "chat" | "chien";
    photoUrl: string | null;
    shelterName: string | null;
    distanceKm: number;
  }>;
  userName: string;
}): { subject: string; html: string; text: string } {
  const { pets, userName } = params;
  const plural = pets.length > 1;
  const speciesSet = new Set(pets.map((p) => p.species).filter(Boolean));
  const noun =
    speciesSet.size === 1
      ? speciesSet.has("chien")
        ? plural
          ? "nouveaux chiens"
          : "nouveau chien"
        : plural
          ? "nouveaux chats"
          : "nouveau chat"
      : plural
        ? "nouveaux animaux"
        : "nouveau compagnon";
  const title = `${pets.length} ${noun} à adopter près de chez vous`;

  const catsHtml = pets
    .map((c) => {
      const photo = c.photoUrl
        ? `<img src="${c.photoUrl}" alt="" style="width:72px;height:72px;border-radius:12px;object-fit:cover;vertical-align:middle;margin-right:12px">`
        : `<div style="display:inline-block;width:72px;height:72px;border-radius:12px;background:#f3f0ea;vertical-align:middle;margin-right:12px"></div>`;
      return `<a href="${baseUrl}/adopter/${c.id}" style="display:block;padding:12px 0;border-bottom:1px solid #e6e0d5;color:#2b1810;text-decoration:none">
${photo}<span style="display:inline-block;vertical-align:middle">
<strong style="display:block;margin-bottom:2px">${c.name}</strong>
<span style="color:#6b5e4f;font-size:13px">${c.shelterName ?? "Refuge partenaire"} · à ${c.distanceKm.toFixed(1)} km</span>
</span></a>`;
    })
    .join("");

  const catsText = pets
    .map(
      (c) =>
        `· ${c.name} (${c.shelterName ?? "refuge"}, ${c.distanceKm.toFixed(1)} km)\n  ${baseUrl}/adopter/${c.id}`
    )
    .join("\n");

  const hello = userName ? `Bonjour ${userName.split(" ")[0]},` : "Bonjour,";
  const text = `${hello}\n\n${title} :\n\n${catsText}\n\nVoir tous les animaux : ${baseUrl}/adopter\n\n· Dorloter\n\nVous recevez ce récap hebdo parce que votre profil a une localisation définie. Ajustez le rayon ou désactivez sur ${baseUrl}/profil`;
  return {
    subject: `${title} · Dorloter`,
    text,
    html: card(
      title,
      `${hello}<br><br>Voici les nouveautés de la semaine dans votre rayon :${catsHtml}`,
      "Tout voir",
      "/adopter"
    ),
  };
}
