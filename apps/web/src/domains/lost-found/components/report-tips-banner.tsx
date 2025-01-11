import {
  Camera,
  Clock,
  Lightbulb,
  MapPin,
  Megaphone,
  Phone,
  Search,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ReportTipsBannerProps {
  type: "perdu" | "trouve";
  /** Nombre de jours depuis la création du signalement */
  daysActive: number;
}

interface Tip {
  Icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * Bannière de conseils contextuelle selon le type de signalement et son
 * âge. Plus le signalement vieillit, plus les conseils s'orientent vers
 * la persévérance et l'élargissement de la zone.
 */
export function ReportTipsBanner({ type, daysActive }: ReportTipsBannerProps) {
  const tips = getTips(type, daysActive);
  return (
    <section className="rounded-2xl border border-coral-200 bg-coral-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-coral-600" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-coral-700">
          Conseils pour maximiser vos chances
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tips.map((tip, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-xl border border-coral-100 bg-white/70 p-3"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-100 text-coral-700">
              <tip.Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {tip.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tip.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getTips(type: "perdu" | "trouve", days: number): Tip[] {
  if (type === "perdu") {
    // Conseils animal perdu — évoluent avec le temps écoulé
    if (days <= 1) {
      // Première phase : action immédiate
      return [
        {
          Icon: Search,
          title: "Cherchez à pied dans les 500 m",
          body: "La plupart des chats perdus se cachent dans un rayon de 500 m. Appelez-le doucement à la tombée du jour.",
        },
        {
          Icon: Megaphone,
          title: "Prévenez le voisinage",
          body: "Glissez un mot dans les boîtes aux lettres autour du lieu de disparition, avec une photo et votre numéro.",
        },
        {
          Icon: Stethoscope,
          title: "Contactez les vétérinaires proches",
          body: "Un vétérinaire peut avoir reçu un animal correspondant. La fonction « Rechercher un véto » vous aide à les lister.",
        },
        {
          Icon: Phone,
          title: "Déclarez à l'I-CAD",
          body: "Si votre animal est identifié, signalez-le perdu sur i-cad.fr pour que tout véto qui le lit soit alerté.",
        },
      ];
    }
    if (days <= 7) {
      // Phase moyenne : élargir
      return [
        {
          Icon: MapPin,
          title: "Élargissez la zone de recherche",
          body: "Après 48h, un chat peut s'être déplacé d'1 à 2 km. Étendez votre recherche et collez des affiches.",
        },
        {
          Icon: Camera,
          title: "Affiches papier et écoles",
          body: "Imprimez l'affiche et collez-la chez les commerçants, écoles, vétérinaires et associations du quartier.",
        },
        {
          Icon: Clock,
          title: "Maintenez la vigilance le soir",
          body: "Les chats stressés sortent surtout entre 22h et 6h. Posez de la nourriture odorante (boîte) sur le lieu connu.",
        },
        {
          Icon: Search,
          title: "Contactez les refuges et fourrières",
          body: "Visitez physiquement (ils ne reconnaissent pas toujours via téléphone). Vérifiez le centre de fourrière SACPA aussi.",
        },
      ];
    }
    // Phase longue : ne pas abandonner
    return [
      {
        Icon: Lightbulb,
        title: "Ne baissez pas les bras",
        body: "Des animaux sont retrouvés des semaines voire des mois après. Tenez l'annonce active et republiez régulièrement.",
      },
      {
        Icon: Camera,
        title: "Photo piège",
        body: "Posez une caméra ou un téléphone en mode timelapse sur le lieu connu pour confirmer qu'il y revient.",
      },
      {
        Icon: Megaphone,
        title: "Relancez les réseaux locaux",
        body: "Groupes Facebook locaux, Nextdoor, AVPA, refuges associatifs — relancez-les tous les 7 à 10 jours.",
      },
      {
        Icon: Stethoscope,
        title: "Re-contactez les vétos régulièrement",
        body: "Un animal peut être déposé bien après la disparition. Un rappel toutes les 2 semaines garde le réflexe.",
      },
    ];
  }

  // type === "trouve"
  return [
    {
      Icon: Stethoscope,
      title: "Faites lire la puce électronique",
      body: "Tout vétérinaire peut scanner gratuitement la puce d'identification et vous mettre en relation avec le propriétaire via l'I-CAD.",
    },
    {
      Icon: Phone,
      title: "Déclarez à l'I-CAD obligatoirement",
      body: "Tout animal trouvé doit être déclaré sur i-cad.fr. C'est une obligation légale (Code rural), pas une option.",
    },
    {
      Icon: MapPin,
      title: "Postez dans les groupes locaux",
      body: "Le propriétaire cherche probablement aussi de son côté. Multipliez les canaux : groupes Facebook quartier, Nextdoor, mairie.",
    },
    {
      Icon: Camera,
      title: "Décrivez précisément",
      body: "Couleur, taille, signes distinctifs, comportement, attitude au contact, état de santé apparent : tout aide à valider une correspondance.",
    },
  ];
}
