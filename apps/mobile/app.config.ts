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

const config: ExpoConfig = {
  name: "Dorloter",
  slug: "dorloter",
  scheme: "dorloter",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "fr.dorloter.app",
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
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
      "expo-splash-screen",
      {
        backgroundColor: "#fff5f1",
        image: "./assets/splash.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl,
    // À renseigner après `eas init` la première fois.
    eas: {
      projectId: "REPLACE_WITH_EAS_PROJECT_ID",
    },
  },
};

export default config;
