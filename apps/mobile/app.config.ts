/**
 * Configuration Expo de l'app mobile Dorloter.
 *
 * - Bundle id `fr.dorloter.app` (à conserver — change l'identité côté
 *   stores et les push tokens APNs/FCM)
 * - New Architecture activée (Fabric/TurboModules) — par défaut SDK 53+
 * - Typed routes Expo Router : génère les types des paths dans .expo/types/
 * - `extra.apiBaseUrl` : URL de l'API consommée par le client REST
 *   (apps/web en dev local, dorloter.fr en prod). Surchargeable via la
 *   variable d'env `EXPO_PUBLIC_API_BASE_URL` au moment du build EAS.
 */

import type { ExpoConfig } from "expo/config";

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

// Style de tuiles vectorielles. OpenFreeMap = 100% open-source, hébergé
// en Europe, gratuit jusqu'à 50k req/jour. À surcharger via
// EXPO_PUBLIC_MAP_STYLE_URL pour passer sur MapTiler/Protomaps si besoin
// (ex. CDN dédié en prod).
const mapStyleUrl =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";

// DSN Sentry — laissé vide = Sentry init no-op (dev local). Valoriser
// par profile EAS via `eas.json.build.<profile>.env.EXPO_PUBLIC_SENTRY_DSN`.
// Alternative souveraine EU : GlitchTip (Sentry-compatible).
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

const config: ExpoConfig = {
  name: "Dorloter",
  slug: "dorloter",
  scheme: "dorloter",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "fr.dorloter.app",
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "Dorloter utilise votre position pour afficher les signalements perdus / trouvés autour de vous.",
    },
  },
  android: {
    package: "fr.dorloter.app",
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#e8634d",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Dorloter utilise votre position pour afficher les signalements perdus / trouvés autour de vous.",
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Dorloter accède à vos photos pour vous permettre d'illustrer vos signalements perdus / trouvés.",
        cameraPermission:
          "Dorloter peut prendre une photo pour illustrer un signalement perdu / trouvé.",
      },
    ],
    [
      "expo-av",
      {
        microphonePermission:
          "Dorloter accède au micro pour enregistrer vos messages vocaux dans les conversations avec les refuges.",
      },
    ],
    "@maplibre/maplibre-react-native",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#fff5f1",
        image: "./assets/splash.png",
        imageWidth: 200,
      },
    ],
    "@sentry/react-native/expo",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl,
    mapStyleUrl,
    sentryDsn,
    eas: {
      projectId: "9cb21605-5994-465a-980a-6e62fbde1d6c",
    },
  },
};

export default config;
