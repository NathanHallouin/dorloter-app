import { Link } from "react-router-dom";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { LegalSection } from "@/components/legal/LegalSection";

/** Conditions générales d'utilisation de la plateforme. */
export function TermsPage() {
  return (
    <LegalDoc
      crumb="CGU"
      title="Conditions générales d'utilisation"
      sub="Le cadre de ce que chacun peut attendre : vous, les refuges, les pensions et nous."
      updatedAt="11 mars 2026"
    >
      <LegalSection n={1} title="Objet">
        <p>
          Dorloter est une plateforme de mise en relation. Elle poursuit trois missions : présenter les
          animaux proposés à l'adoption par des refuges et associations partenaires, faire circuler les
          signalements d'animaux perdus ou trouvés, et référencer des pensions professionnelles agréées.
        </p>
        <p>
          Les présentes conditions régissent l'utilisation du site. Créer un compte ou déposer un signalement
          vaut acceptation.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Rôle de la plateforme">
        <p>
          <strong>Dorloter n'est partie à aucune adoption, à aucun accueil et à aucune réservation.</strong>{" "}
          La décision d'adoption appartient au refuge, le contrat est conclu directement entre le refuge et
          l'adoptant, et la prestation de garde est conclue directement avec la pension. Nous ne percevons
          aucune commission sur ces opérations.
        </p>
        <p>
          Nous ne garantissons ni l'exactitude des informations publiées par les refuges, les pensions et les
          utilisateurs, ni l'issue d'une démarche engagée par leur intermédiaire. Nous nous engageons en
          revanche à retirer promptement tout contenu manifestement illicite qui nous est signalé.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Compte">
        <p>
          La consultation du catalogue d'adoption, de la carte des signalements et de l'annuaire des pensions
          est libre et ne nécessite aucun compte. Un compte est requis pour signaler un animal, candidater,
          enregistrer des favoris, échanger avec un partenaire ou gérer une structure.
        </p>
        <p>
          Vous êtes responsable de l'exactitude des informations de votre compte et de la confidentialité de
          votre mot de passe. Vous pouvez supprimer votre compte à tout moment depuis votre profil.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Règles de publication">
        <p>En publiant un contenu sur Dorloter, vous vous engagez à ce qu'il soit exact et licite. Sont en particulier interdits :</p>
        <ul>
          <li>la vente d'animaux, ainsi que toute annonce de cession à titre onéreux hors du cadre légal des refuges et associations ;</li>
          <li>les signalements fantaisistes, dupliqués ou destinés à nuire ;</li>
          <li>la publication de coordonnées ou de photographies de tiers sans leur accord ;</li>
          <li>les propos injurieux, diffamatoires, haineux ou discriminatoires ;</li>
          <li>toute extraction automatisée massive du contenu du site.</li>
        </ul>
        <p>
          Vous conservez vos droits sur les photographies que vous déposez, et vous nous accordez le droit de
          les afficher sur la plateforme le temps nécessaire à la finalité poursuivie, à savoir l'adoption ou
          la recherche de l'animal.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Refuges et pensions">
        <p>
          L'accès à l'espace professionnel est réservé aux structures vérifiées. Les pensions doivent
          justifier d'un numéro SIRET et d'un agrément préfectoral, contrôlés manuellement par notre équipe
          avant toute publication. Une fiche non vérifiée n'apparaît pas dans l'annuaire public.
        </p>
        <p>
          Les structures partenaires s'engagent à tenir leurs annonces à jour, notamment à retirer sans délai
          un animal qui n'est plus disponible, et à traiter les candidatures reçues avec diligence et respect.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Modération">
        <p>
          Chaque fiche et chaque signalement peut être signalé à la modération depuis le bouton dédié. Nous
          pouvons retirer un contenu, suspendre ou supprimer un compte en cas de manquement aux présentes
          conditions. Sauf urgence ou obligation légale, la mesure vous est notifiée avec son motif, et vous
          pouvez la contester en répondant à cette notification.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Disponibilité">
        <p>
          Le service est fourni en l'état, sans garantie de disponibilité continue. Des interruptions peuvent
          survenir pour maintenance ou en cas d'incident. Nous nous efforçons de les limiter et de les annoncer
          lorsqu'elles sont prévisibles.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link to="/confidentialite" className="inline-link">politique de confidentialité</Link>, qui fait partie intégrante des
          présentes conditions.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de différend, une solution amiable
          sera recherchée en priorité. À défaut, le litige relève des juridictions françaises compétentes.
          Un consommateur peut recourir gratuitement à un médiateur de la consommation.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
