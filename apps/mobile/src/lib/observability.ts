/**
 * Observabilité production — Sentry RN.
 *
 * Init idempotent appelé une seule fois en root layout. Si pas de DSN
 * configuré (ex. dev local), Sentry init no-op et l'app continue sans
 * télémétrie.
 *
 * Le DSN est passé par variable d'env `EXPO_PUBLIC_SENTRY_DSN` au
 * moment du build EAS (cf. eas.json par profile). Pas commité en repo.
 *
 * Alternative souveraine EU (mentionnée dans HEBERGEMENT-ET-API.md) :
 * GlitchTip est Sentry-compatible — pour migrer, juste remplacer le
 * DSN par celui d'une instance GlitchTip self-hosted.
 */

import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

let initialized = false;

export function initObservability(): void {
  if (initialized) return;
  initialized = true;

  const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.info(
      "[observability] EXPO_PUBLIC_SENTRY_DSN absent — Sentry init skipped (dev local)."
    );
    return;
  }

  Sentry.init({
    dsn,
    // 100% des erreurs (free tier ≥ 5k events/mois suffit pour un MVP).
    sampleRate: 1.0,
    // Performance traces : 10% suffit, on monitore surtout les pages
    // critiques (signaler, postuler) si on veut affiner.
    tracesSampleRate: 0.1,
    // Le bundle id + version sont auto-tagués par le SDK via Constants.
    debug: false,
    // Anti-bruit : ne pas remonter les erreurs de network classiques
    // (l'app les présente déjà à l'utilisateur via Alert).
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof Error) {
        if (
          error.message.includes("Network request failed") ||
          error.message.includes("AbortError")
        ) {
          return null;
        }
      }
      return event;
    },
  });
}

export { Sentry };
