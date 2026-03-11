import { Link } from "react-router-dom";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { LegalSection } from "@/components/legal/LegalSection";
import { ToFill } from "@/components/legal/ToFill";

/**
 * Mentions légales · obligation de l'article 6 III de la LCEN.
 * Les informations d'identité de l'éditeur sont à compléter (cf. ToFill).
 */
export function LegalNoticePage() {
  return (
    <LegalDoc
      crumb="Mentions légales"
      title="Mentions légales"
      sub="Qui édite Dorloter, qui l'héberge, et comment nous joindre."
      updatedAt="11 mars 2026"
    >
      <LegalSection n={1} title="Éditeur du site">
        <p>
          Le site <strong>dorloter.fr</strong> et son espace professionnel <strong>pro.dorloter.fr</strong> sont
          édités par :
        </p>
        <ul>
          <li>Dénomination : <ToFill>raison sociale exacte de l'association</ToFill></li>
          <li>Forme juridique : association loi 1901</li>
          <li>Siège social : <ToFill>adresse postale complète</ToFill></li>
          <li>Numéro RNA : <ToFill>numéro W…</ToFill></li>
          <li>Numéro SIREN : <ToFill>SIREN si l'association est immatriculée</ToFill></li>
          <li>Adresse électronique : <ToFill>contact@dorloter.fr ou équivalent</ToFill></li>
          <li>Téléphone : <ToFill>numéro de contact</ToFill></li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="Direction de la publication">
        <p>
          Directeur ou directrice de la publication : <ToFill>nom et prénom du représentant légal</ToFill>.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Hébergement">
        <p>
          Le site est hébergé sur une infrastructure située en France, opérée par :
        </p>
        <ul>
          <li>OVH SAS, 2 rue Kellermann, 59100 Roubaix, France</li>
          <li>Téléphone : 1007 (depuis la France)</li>
        </ul>
        <p>
          Aucune donnée n'est stockée ni traitée en dehors de l'Union européenne. Si l'hébergeur venait à
          changer, cette rubrique serait mise à jour avant la migration.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Propriété intellectuelle">
        <p>
          La charte graphique, les textes et le code de la plateforme sont la propriété de l'éditeur, sauf
          mention contraire. Les photographies d'animaux sont publiées par les refuges, les pensions et les
          personnes qui déposent un signalement : elles restent la propriété de leurs auteurs, qui en
          autorisent la diffusion sur la plateforme pour les besoins de l'adoption ou de la recherche de
          l'animal.
        </p>
        <p>
          Les fonds cartographiques proviennent d'OpenStreetMap et de ses contributeurs, diffusés sous licence
          ODbL. Les polices de caractères sont diffusées sous licence SIL Open Font License et servies depuis
          nos propres serveurs.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit en détail dans notre{" "}
          <Link to="/confidentialite" className="inline-link">politique de confidentialité</Link>, qui précise les données collectées,
          leurs finalités, leurs durées de conservation et la façon d'exercer vos droits.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Signaler un contenu">
        <p>
          Tout contenu illicite ou trompeur (fausse annonce, animal proposé à la vente, propos injurieux) peut
          être signalé depuis le bouton prévu sur chaque fiche, ou par courriel à l'adresse de contact
          ci-dessus. Les signalements sont traités par l'équipe de modération dans les meilleurs délais.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
