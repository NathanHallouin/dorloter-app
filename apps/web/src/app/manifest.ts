import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dorloter — adopter, retrouver, prendre soin",
    short_name: "Dorloter",
    description:
      "Adoptez un animal en refuge ou signalez un compagnon perdu ou trouvé. Plateforme française, géolocalisée, avec mise en relation automatique.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#faf9f6",
    theme_color: "#e8634d",
    categories: ["lifestyle", "social", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Signaler un animal",
        url: "/signaler",
        description: "Signaler un animal perdu ou trouvé",
      },
      {
        name: "Adopter",
        url: "/adopter",
        description: "Parcourir les animaux à adopter",
      },
      {
        name: "Perdus / Trouvés",
        url: "/perdus-trouves",
        description: "Carte des signalements",
      },
    ],
  };
}
