/**
 * Helpers pour la position utilisateur via expo-location.
 *
 * Pattern :
 *   - on demande la permission "when in use" (pas de background)
 *   - on récupère une position avec accuracy "Balanced" (rapide + suffisant
 *     pour centrer une carte à l'échelle de la ville)
 *   - on ne stocke rien : à chaque ouverture de la carte, on ré-interroge
 *
 * Si l'utilisateur refuse, l'appelant doit fallback (centrer Paris ou
 * la ville d'inscription du user — info qu'on ne connaît pas encore en
 * MVP, donc fallback Paris).
 */

import * as Location from "expo-location";

export interface UserCoords {
  latitude: number;
  longitude: number;
}

/**
 * Centre par défaut quand on n'a pas la position de l'user (refus, hors
 * device, erreur). Paris République — neutre, central, lisible.
 */
export const DEFAULT_CENTER: UserCoords = {
  latitude: 48.8676,
  longitude: 2.3631,
};

export type LocationStatus =
  | { kind: "granted"; coords: UserCoords }
  | { kind: "denied" }
  | { kind: "error"; message: string };

/**
 * Demande la permission (si pas encore accordée) et récupère la
 * position courante. Ne throw jamais — toute erreur revient en
 * `LocationStatus`.
 */
export async function getCurrentLocation(): Promise<LocationStatus> {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const ask = await Location.requestForegroundPermissionsAsync();
      status = ask.status;
    }
    if (status !== "granted") {
      return { kind: "denied" };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      kind: "granted",
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
