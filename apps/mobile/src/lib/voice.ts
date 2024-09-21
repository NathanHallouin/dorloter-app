/**
 * Helper d'enregistrement audio via expo-av.
 *
 * Pourquoi un module dédié plutôt que d'utiliser expo-av directement
 * depuis le composant : on encapsule la gestion des permissions, l'audio
 * mode (allowsRecordingIOS) et les options par défaut. Les composants
 * appellent juste start/stop/cancel et reçoivent { uri, durationMs }.
 *
 * Format produit : m4a (audio/mp4) — natif iOS et Android, lisible par
 * les navigateurs modernes (web peut aussi le jouer).
 *
 * Note : `expo-av` est un module natif qui doit être présent dans le
 * binaire de l'app (dev-client EAS build). On le charge en `require()`
 * lazy + try/catch : si l'utilisateur ouvre un thread avec un dev-client
 * pas encore rebuild, le module n'est pas dispo mais l'écran ne crash
 * pas — seule la fonction record renvoie une erreur explicite.
 */

import { NativeModules } from "react-native";
import type { Audio as AudioType } from "expo-av";

export interface VoiceRecording {
  uri: string;
  durationMs: number;
  mimeType: "audio/mp4";
}

export interface RecorderHandle {
  stop(): Promise<VoiceRecording | null>;
  cancel(): Promise<void>;
  getDurationMs(): number;
}

let cachedAudio: typeof AudioType | null | undefined = undefined;

/**
 * Détecte si le pont natif `expo-av` est linké dans le binaire courant.
 *
 * Important : un simple `require("expo-av")` ne suffit pas — le JS du
 * module est dans le bundle Metro même sans natif, et les méthodes
 * comme `requestPermissionsAsync()` retournent alors des Promises qui
 * ne résolvent JAMAIS (ni reject ni resolve). On sonde directement
 * `NativeModules` pour échouer vite et proprement.
 */
function isExpoAvNativeLinked(): boolean {
  const nm = NativeModules as Record<string, unknown>;
  return Boolean(nm.ExpoAV ?? nm.ExponentAV ?? nm.ExpoAudio);
}

function getAudio(): typeof AudioType | null {
  if (cachedAudio !== undefined) return cachedAudio;
  if (!isExpoAvNativeLinked()) {
    cachedAudio = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedAudio = require("expo-av").Audio as typeof AudioType;
  } catch {
    cachedAudio = null;
  }
  return cachedAudio;
}

/** True si le module natif `expo-av` est disponible dans ce binaire. */
export function isVoiceSupported(): boolean {
  return getAudio() !== null;
}

/**
 * Demande la permission micro et démarre l'enregistrement. Retourne un
 * handle pour arrêter / annuler / poll la durée pendant l'enregistrement.
 *
 * Throws si :
 *   - le module natif n'est pas dispo (dev-client à rebuild)
 *   - l'utilisateur refuse la permission micro
 */
export async function startRecording(): Promise<RecorderHandle> {
  const Audio = getAudio();
  if (!Audio) {
    throw new Error(
      "Module audio indisponible — rebuild le dev-client (bun mobile:build) pour activer les messages vocaux."
    );
  }

  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error(
      "Permission micro refusée. Active-la dans les réglages pour enregistrer."
    );
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  await recording.startAsync();

  const startedAt = Date.now();

  return {
    async stop() {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        // déjà unload ; on poursuit
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
        () => {}
      );
      const uri = recording.getURI();
      if (!uri) return null;
      const durationMs = Date.now() - startedAt;
      return { uri, durationMs, mimeType: "audio/mp4" };
    },
    async cancel() {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        // ignore
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
        () => {}
      );
    },
    getDurationMs() {
      return Date.now() - startedAt;
    },
  };
}
