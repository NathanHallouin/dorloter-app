import { Link } from "react-router-dom";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { LegalSection } from "@/components/legal/LegalSection";
import { ToFill } from "@/components/legal/ToFill";

/**
 * Politique de confidentialité · information préalable exigée par l'article 13
 * du RGPD.
 *
 * Ce document décrit le traitement réellement effectué par la plateforme. Toute
 * évolution du modèle de données ou des durées de purge (cf. le service de
 * rétention de l'API) doit être répercutée ici.
 */
export function PrivacyPage() {
  return (
    <LegalDoc
      crumb="Confidentialité"
      title="Politique de confidentialité"
      sub="Quelles données nous traitons, pourquoi, combien de temps, et comment garder la main dessus."
      updatedAt="11 mars 2026"
    >
      <LegalSection n={1} title="Responsable du traitement">
        <p>
          Le responsable du traitement est l'association éditrice de Dorloter, dont les coordonnées figurent
          dans les <Link to="/mentions-legales" className="inline-link">mentions légales</Link>. Pour toute question relative à vos
          données, écrivez à <ToFill>adresse email dédiée, ex. privacy@dorloter.fr</ToFill>.
        </p>
        <p>
          Nous ne vendons aucune donnée, ne faisons pas de publicité ciblée et n'utilisons aucun outil de
          profilage publicitaire.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Données collectées et finalités">
        <p><strong>Compte utilisateur</strong> · adresse email, nom, mot de passe (jamais stocké en clair,
          uniquement une empreinte scrypt), et si vous les renseignez : téléphone, photo de profil, position
          approximative et rayon d'alerte. Finalité : vous identifier, sécuriser l'accès, vous permettre de
          candidater, signaler ou échanger. Base légale : exécution du contrat que constituent les conditions
          d'utilisation.
        </p>
        <p><strong>Signalements perdus et trouvés</strong> · description physique de l'animal, race, couleur,
          sexe, identification éventuelle, signes distinctifs, photographies, <strong>lieu précis</strong> de
          perte ou de découverte, date, et coordonnées de contact que vous choisissez de laisser. Finalité :
          publier l'alerte et calculer automatiquement les rapprochements avec les autres signalements.
          Base légale : intérêt légitime à retrouver un animal perdu, sur la base d'une publication que vous
          initiez volontairement.
        </p>
        <p><strong>Candidatures à l'adoption</strong> · type de logement, accès extérieur, présence d'autres
          animaux, présence et âge des enfants, expérience, motivation, disponibilités. Ces éléments sont
          transmis au refuge concerné, qui peut y ajouter des notes internes. Finalité : permettre au refuge
          d'apprécier l'adéquation entre l'animal et le foyer. Base légale : mesures précontractuelles prises
          à votre demande.
        </p>
        <p><strong>Usage de la plateforme</strong> · favoris, messages échangés avec les refuges et pensions,
          notifications, demandes de réservation, inscriptions aux événements et aux missions de bénévolat,
          contrats d'adoption ou de famille d'accueil et leur suivi. Finalité : fournir les fonctionnalités
          correspondantes. Base légale : exécution du contrat.
        </p>
        <p><strong>Alertes de proximité</strong> · votre position approximative et votre rayon servent à vous
          signaler les nouveautés autour de vous. Base légale : votre consentement, retirable à tout moment
          depuis votre profil sans justification.
        </p>
        <p><strong>Données techniques</strong> · journaux du serveur web contenant votre adresse IP, votre
          navigateur, l'URL appelée et l'horodatage. Finalité : sécurité, détection d'abus et diagnostic
          d'incident. Base légale : intérêt légitime à assurer la sécurité du service.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Ce que voient les autres">
        <p>
          Un signalement est public par nature : sa description, ses photos et sa zone apparaissent sur la
          carte pour permettre à quelqu'un de reconnaître l'animal. En revanche, <strong>vos coordonnées de
          contact ne sont jamais affichées en clair</strong> dans les listes ni sur la carte : elles ne sont
          révélées qu'au cas par cas, à une personne connectée qui en fait la demande explicite sur un
          signalement donné.
        </p>
        <p>
          Une candidature n'est visible que par le refuge auquel elle est adressée. Une conversation n'est
          visible que par ses participants. Vos favoris ne sont visibles que par vous.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Durées de conservation">
        <ul>
          <li>
            Compte : jusqu'à ce que vous le supprimiez. Un compte resté inactif trois ans est
            supprimé, après un email vous prévenant trente jours à l'avance : une simple
            reconnexion suffit à le conserver.
          </li>
          <li>Signalements : passés en « expiré » au bout de douze mois sans activité, puis supprimés douze mois après leur résolution ou leur expiration.</li>
          <li>Candidatures : trois ans après leur clôture, afin de pouvoir traiter une contestation.</li>
          <li>Contrats d'adoption et conventions de famille d'accueil : cinq ans à compter de leur fin, comme pièces justificatives.</li>
          <li>Messages : trois ans après le dernier échange de la conversation.</li>
          <li>Notifications : douze mois.</li>
          <li>Signalements de modération : douze mois après traitement.</li>
          <li>Jetons de connexion : supprimés dès leur expiration.</li>
          <li>Journaux techniques : douze mois au maximum.</li>
        </ul>
        <p>
          Ces purges sont automatisées côté serveur, elles ne dépendent pas d'une intervention manuelle.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Destinataires et sous-traitants">
        <p>
          Vos données sont accessibles à l'équipe de Dorloter strictement dans la mesure nécessaire à
          l'exploitation et à la modération du service, ainsi qu'au refuge ou à la pension que vous
          contactez, pour ce qui le concerne.
        </p>
        <p>Nous faisons appel aux sous-traitants suivants, tous situés dans l'Union européenne :</p>
        <ul>
          <li>OVH (France) · hébergement des serveurs, de la base de données et des sauvegardes.</li>
          <li>Brevo (France) · acheminement des emails transactionnels (confirmation, décision de candidature).</li>
          <li>Fournisseur de fonds cartographiques · affichage des cartes. Votre adresse IP lui est transmise lors du chargement des tuiles.</li>
        </ul>
        <p>
          <strong>Aucun transfert de données en dehors de l'Union européenne</strong> n'est réalisé.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Cookies et stockage local">
        <p>
          Dorloter <strong>ne dépose aucun cookie</strong> de mesure d'audience, de réseau social ou de
          publicité. Aucun bandeau de consentement n'est donc nécessaire.
        </p>
        <p>
          Nous utilisons uniquement le stockage local de votre navigateur pour deux choses strictement
          nécessaires au fonctionnement du service : conserver votre session une fois connecté, et mémoriser
          votre préférence de thème clair ou sombre. Vider les données du site les efface.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Vos droits">
        <p>
          Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de
          portabilité sur vos données. Concrètement :
        </p>
        <ul>
          <li><strong>Consulter et corriger</strong> vos informations : depuis votre <Link to="/profil" className="inline-link">profil</Link>.</li>
          <li><strong>Récupérer une copie</strong> de toutes vos données dans un fichier lisible par machine : bouton « Télécharger mes données » de votre profil.</li>
          <li><strong>Supprimer votre compte</strong> et les données associées : bouton « Supprimer mon compte » de votre profil. L'effacement est immédiat et définitif.</li>
          <li><strong>Retirer votre consentement</strong> aux alertes de proximité : réglage des notifications de votre profil.</li>
          <li><strong>Vous opposer</strong> à un traitement fondé sur notre intérêt légitime, ou en demander la limitation : par email à l'adresse indiquée en tête de ce document.</li>
        </ul>
        <p>
          Certaines données peuvent être conservées au-delà de la suppression du compte lorsqu'une obligation
          légale l'impose, en particulier les contrats d'adoption signés. Dans ce cas elles sont dissociées de
          votre profil et conservées uniquement à ce titre.
        </p>
        <p>
          Si une réponse ne vous satisfait pas, vous pouvez introduire une réclamation auprès de la CNIL,
          3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou en ligne sur cnil.fr.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Sécurité">
        <p>
          Les échanges sont chiffrés en HTTPS. Les mots de passe sont conservés sous forme d'empreintes
          scrypt, jamais en clair. L'application accède à la base de données via un rôle aux privilèges
          restreints, distinct du rôle d'administration. Des sauvegardes quotidiennes sont réalisées et
          conservées sur une infrastructure européenne distincte du serveur de production.
        </p>
        <p>
          En cas de violation de données susceptible d'engendrer un risque élevé pour vos droits, vous en
          seriez informé dans les meilleurs délais, conformément à l'article 34 du RGPD.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Mineurs">
        <p>
          La création d'un compte est réservée aux personnes de quinze ans révolus. En deçà, elle requiert
          l'accord d'un titulaire de l'autorité parentale.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Évolution de ce document">
        <p>
          Toute modification substantielle vous est signalée par une notification dans l'application avant son
          entrée en vigueur. La date de dernière mise à jour figure en tête de cette page.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
