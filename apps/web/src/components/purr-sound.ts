/**
 * Joue un véritable échantillon audio de ronronnement.
 *
 * Le fichier attendu est `/public/sounds/purr.mp3`. S'il est absent ou
 * échoue à charger, on retombe silencieusement — l'easter egg garde son
 * animation visuelle.
 *
 * Le navigateur exige un "user gesture" pour démarrer la lecture audio
 * — c'est précisément le 4ᵉ clic sur la patte qui le légitime.
 */

const PURR_URL = "/sounds/purr.mp3";
const PURR_VOLUME = 0.6; // 0..1 — pas trop fort pour ne pas surprendre

export function playPurr(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  try {
    const audio = new Audio(PURR_URL);
    audio.volume = PURR_VOLUME;
    audio.preload = "auto";

    // Web autoplay : `play()` retourne une Promise qui rejette si le
    // navigateur refuse. On attrape pour ne jamais polluer la console
    // par défaut — l'animation visuelle est suffisante seule.
    return audio.play().catch(() => {
      // Soit le fichier est absent (404), soit autoplay refusé. On
      // continue sans son.
    });
  } catch {
    return Promise.resolve();
  }
}
