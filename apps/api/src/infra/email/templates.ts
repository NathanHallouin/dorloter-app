/** Gabarits HTML simples des emails transactionnels. */

export interface EmailTemplate {
  subject: string;
  html: string;
}

function wrap(title: string, body: string): string {
  return (
    '<div style="font-family: system-ui, Arial, sans-serif; max-width: 560px; ' +
    'margin: 0 auto; color: #23201a; line-height: 1.5;">' +
    `<h2 style="color: #1f6f4f; font-family: Georgia, serif;">${title}</h2>` +
    body +
    '<p style="margin-top: 28px; font-size: 12px; color: #7c6c50;">' +
    'Dorloter · adoption et protection animale</p></div>'
  );
}

/** Décision de candidature (acceptation / refus). */
export function applicationDecision(petName: string, accepted: boolean): EmailTemplate {
  if (accepted) {
    return {
      subject: `Votre candidature pour ${petName} a été acceptée`,
      html: wrap(
        'Bonne nouvelle !',
        `<p>Votre candidature pour l'adoption de <strong>${petName}</strong> a été ` +
          '<strong>acceptée</strong> par le refuge. Il vous recontactera pour la suite ' +
          "(rencontre, contrat d'adoption).</p>",
      ),
    };
  }
  return {
    subject: `Votre candidature pour ${petName}`,
    html: wrap(
      'Réponse à votre candidature',
      "<p>Le refuge ne donne pas suite à votre candidature pour " +
        `<strong>${petName}</strong>. Merci de votre intérêt, et n'hésitez pas à ` +
        'consulter les autres animaux à l\'adoption.</p>',
    ),
  };
}

/**
 * Relance avant suppression d'un compte inactif (RGPD art. 5.1.e).
 *
 * Il ne s'agit pas d'une relance commerciale : le message annonce une
 * suppression et indique comment s'y opposer, à savoir simplement se
 * reconnecter. Ne rien faire conduit à l'effacement, ce qui doit être dit sans
 * ambiguïté.
 */
export function inactiveAccountWarning(
  name: string,
  inactiveYears: number,
  graceDays: number,
  loginUrl: string,
): EmailTemplate {
  return {
    subject: 'Votre compte Dorloter va être supprimé',
    html: wrap(
      'Votre compte va être supprimé',
      `<p>Bonjour ${name},</p>` +
        `<p>Votre compte Dorloter n'a pas été utilisé depuis plus de ` +
        `<strong>${inactiveYears} ans</strong>. Nous ne conservons pas les données ` +
        'des comptes devenus inactifs : le vôtre sera donc supprimé, ainsi que les ' +
        'contenus qui y sont rattachés, dans ' +
        `<strong>${graceDays} jours</strong>.</p>` +
        '<p><strong>Pour le conserver, il suffit de vous reconnecter.</strong> ' +
        'Aucune autre démarche n\'est nécessaire.</p>' +
        `<p><a href="${loginUrl}" style="color: #1f6f4f;">Se connecter à Dorloter</a></p>` +
        "<p>Si vous préférez que votre compte soit supprimé, vous n'avez rien à faire. " +
        'Vous pouvez aussi le supprimer vous-même depuis votre profil, à tout moment.</p>',
    ),
  };
}

/** Contrat d'adoption prêt. */
export function contractReady(petName: string, reference: string): EmailTemplate {
  return {
    subject: `Votre contrat d'adoption pour ${petName}`,
    html: wrap(
      'Votre contrat est prêt',
      `<p>Le refuge a préparé votre <strong>contrat d'adoption</strong> pour ` +
        `<strong>${petName}</strong> (référence ${reference}). Il vous sera transmis ` +
        'pour signature.</p>',
    ),
  };
}
