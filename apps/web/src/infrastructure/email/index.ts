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
    subject: "Un dernier clic pour activer le compte — Dorloter",
    text: `Bienvenue.

Un clic sur ce lien pour confirmer votre adresse :
${url}

Le lien expire dans une heure. Si ce n'est pas vous, ignorez simplement ce mail.

— Dorloter`,
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
    subject: "Nouveau mot de passe — Dorloter",
    text: `Pour choisir un nouveau mot de passe, cliquez sur ce lien :
${url}

Lien valable une heure. Si la demande ne vient pas de vous, ignorez ce mail — rien ne change.

— Dorloter`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2b1810">
<h1 style="font-size:22px;margin:0 0 16px">Nouveau mot de passe</h1>
<p>Un clic pour en choisir un nouveau :</p>
<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#e8634d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Choisir un nouveau mot de passe</a></p>
<p style="color:#6b5347;font-size:14px">Ou ce lien dans votre navigateur :<br><a href="${url}" style="color:#e8634d;word-break:break-all">${url}</a></p>
<p style="color:#6b5347;font-size:14px;margin-top:24px">Lien valable une heure. Si la demande ne vient pas de vous, ignorez — rien ne change.</p>
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
    subject: `${title} — Dorloter`,
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
    subject: `${title} — Dorloter`,
    text: `${title}

Un clic pour rejoindre l'équipe :
${url}

Ce lien expire dans 7 jours.

— Dorloter`,
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
    subject: `${title} — Dorloter`,
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
    subject: `${title} — Dorloter`,
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
    subject: `${title} — Dorloter`,
    text,
    html: card(
      title,
      `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #8b72c2;background:#f6f4fb;color:#52483e">${preview.replace(/\n/g, "<br>")}</blockquote>Vous recevez cet email parce que c'est le premier message sur cette conversation. Les messages suivants arrivent uniquement par notification push et dans votre boîte Dorloter.`,
      "Répondre",
      conversationUrl
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
    photoUrl: string | null;
    shelterName: string | null;
    distanceKm: number;
  }>;
  userName: string;
}): { subject: string; html: string; text: string } {
  const { pets, userName } = params;
  const plural = pets.length > 1;
  const title = `${pets.length} ${plural ? "nouveaux chats" : "nouveau chat"} à adopter près de chez vous`;

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
        `— ${c.name} (${c.shelterName ?? "refuge"}, ${c.distanceKm.toFixed(1)} km)\n  ${baseUrl}/adopter/${c.id}`
    )
    .join("\n");

  const hello = userName ? `Bonjour ${userName.split(" ")[0]},` : "Bonjour,";
  const text = `${hello}\n\n${title} :\n\n${catsText}\n\nVoir tous les animaux : ${baseUrl}/adopter\n\n— Dorloter\n\nVous recevez ce récap hebdo parce que votre profil a une localisation définie. Ajustez le rayon ou désactivez sur ${baseUrl}/profil`;
  return {
    subject: `${title} — Dorloter`,
    text,
    html: card(
      title,
      `${hello}<br><br>Voici les nouveautés de la semaine dans votre rayon :${catsHtml}`,
      "Tout voir",
      "/adopter"
    ),
  };
}
