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
  // icon: "./assets/icon.png", — à brancher quand le design d'icône arrive
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  // splash: configuré via le plugin expo-splash-screen ci-dessous (image
  // nullable tant qu'on n'a pas l'asset)
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
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#fff5f1",
        // image: à brancher avec le splash design (PNG 200x200 transparent)
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
