/**
 * Notifications push · wiring Expo + backend Dorloter.
 *
 * Flow :
 *   1. (au login) demande la permission au système
 *   2. récupère le token Expo Push (`ExponentPushToken[xxx]`)
 *   3. POST /api/v1/devices/register (auth via bearer token)
 *   4. (au logout) DELETE /api/v1/devices/{id}
 *
 * Notes :
 *   - L'API Expo Push ne fonctionne PAS sur les emulateurs/simulateurs
 *     (ni iOS Sim ni Android Emu). On vérifie via `Device.isDevice`.
 *   - Sur Android, on doit créer un channel pour que les notifs ne soient
 *     pas silencieuses sur 8.0+. On en crée un par type (cf. emit côté
 *     serveur qui envoie `channelId`).
 *   - Le token Expo peut changer (réinstall, restore device) · on
 *     ré-enregistre à chaque démarrage authentifié, le serveur dédoublonne.
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";

// Comportement quand l'app est au premier plan : on affiche le banner +
// son. Sans ça, RN drop la notif silencieusement parce que l'utilisateur
// est censé déjà voir l'info à l'écran (faux pour notre cas : un signal
// de match arrive même quand l'utilisateur scrolle le catalogue).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NOTIFICATION_CHANNELS: Array<{
  id: "match_found" | "application_update" | "new_cat_nearby" | "report_nearby" | "new_message";
  name: string;
  description: string;
  importance: Notifications.AndroidImportance;
}> = [
  {
    id: "match_found",
    name: "Correspondances perdus/trouvés",
    description: "Quand un signalement potentiellement compatible est trouvé.",
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: "application_update",
    name: "Mises à jour candidature",
    description: "Quand un refuge répond à une candidature d'adoption.",
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: "new_cat_nearby",
    name: "Nouveaux animaux",
    description: "Quand un refuge suivi publie un nouveau profil.",
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  {
    id: "report_nearby",
    name: "Signalements proches",
    description: "Signalement perdu/trouvé dans votre zone.",
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: "new_message",
    name: "Messages",
    description: "Nouveau message reçu.",
    importance: Notifications.AndroidImportance.HIGH,
  },
];

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Promise.all(
    NOTIFICATION_CHANNELS.map((c) =>
      Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        description: c.description,
        importance: c.importance,
        sound: "default",
        enableVibrate: true,
      })
    )
  );
}

interface RegistrationResult {
  /** ID du device en base · utile pour le DELETE au logout. */
  deviceTokenId: string;
  /** Token Expo Push lui-même · exposé pour debug. */
  expoPushToken: string;
}

/**
 * Demande la permission, récupère le token Expo, l'enregistre côté API.
 *
 * Renvoie `null` si :
 *   - on tourne sur un simulateur (pas de push possible)
 *   - l'utilisateur a refusé la permission
 *   - le projectId Expo n'est pas configuré
 *   - une erreur réseau survient (loggée mais non-fatale)
 */
export async function registerForPushNotifications(): Promise<RegistrationResult | null> {
  if (!Device.isDevice) {
    return null;
  }

  await ensureAndroidChannels();

  const settings = await Notifications.getPermissionsAsync();
  let granted =
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const ask = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        provideAppNotificationSettings: true,
      },
    });
    granted =
      ask.granted ||
      ask.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }

  if (!granted) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") {
    console.warn(
      "[notifications] EAS projectId non configuré · push impossible. Lance `eas init` puis update app.config.ts."
    );
    return null;
  }

  let expoPushToken: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    expoPushToken = result.data;
  } catch (err) {
    console.warn("[notifications] getExpoPushTokenAsync échoué :", err);
    return null;
  }

  const platform = Platform.OS === "ios" ? "ios" : "android";
  const deviceName = Device.deviceName ?? null;

  const { data, error } = await api.POST("/devices/register", {
    body: {
      expoPushToken,
      platform,
      deviceName,
    },
  });

  if (error || !data) {
    console.warn("[notifications] /devices/register a échoué :", error);
    return null;
  }

  return {
    deviceTokenId: data.data.id,
    expoPushToken,
  };
}

/**
 * Supprime le device côté serveur. Le caller fournit `deviceTokenId`
 * obtenu lors du `registerForPushNotifications()` réussi.
 */
export async function unregisterPushDevice(deviceTokenId: string): Promise<void> {
  const { error } = await api.DELETE("/devices/{id}", {
    params: { path: { id: deviceTokenId } },
  });
  if (error) {
    // Pas d'exception : un device déjà absent (404) n'est pas un drame.
    console.warn("[notifications] /devices/{id} DELETE a échoué :", error);
  }
}
