/**
 * NSFW — classification des images à l'upload, avec nsfwjs + tfjs-node.
 *
 * Approche souveraine : inférence locale sur le VPS, aucune API tierce.
 * Le modèle (~5 Mo) est téléchargé à la première exécution depuis le CDN
 * nsfwjs et mis en cache mémoire pour toutes les requêtes suivantes du
 * même process Node.
 *
 * Classification nsfwjs (MobileNetV2) :
 *   - Drawing  : dessin / illustration → safe
 *   - Hentai   : porno dessiné → unsafe
 *   - Neutral  : photo normale → safe
 *   - Porn     : pornographie → unsafe
 *   - Sexy     : suggestif mais pas explicite → borderline (toléré)
 *
 * On bloque uniquement si Porn ou Hentai dépasse `NSFW_BLOCK_THRESHOLD`
 * (défaut 0.75). Les chats ne devraient jamais déclencher — si un
 * utilisateur upload autre chose (porno, contenu choquant), on refuse.
 *
 * Désactivable via `NSFW_CHECK_ENABLED=false` pour les environnements où
 * TFjs ne démarre pas (CI, certains builds Alpine sans gcompat). Le check
 * retombe sur un "autorisé par défaut" avec un warning log.
 */

import { logEvent } from "@infra/logger";

const BLOCK_THRESHOLD = Number(process.env.NSFW_BLOCK_THRESHOLD ?? "0.75");
const ENABLED = process.env.NSFW_CHECK_ENABLED !== "false";

type NSFWModel = {
  classify: (
    image: unknown
  ) => Promise<{ className: string; probability: number }[]>;
};

let modelPromise: Promise<NSFWModel> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tfPromise: Promise<any> | null = null;

// Imports via variable string : empêche le bundler Next.js de tracer
// `@tensorflow/tfjs-node` et `nsfwjs` dans le bundle de la fonction
// serverless (Vercel limite 250 Mo, tfjs-node pèse 387 Mo seul).
// Ces modules sont dans `optionalDependencies` — installés en dev pour
// pouvoir activer le check NSFW, skip-ables en prod proto.
const TFJS_MODULE = "@tensorflow/tfjs-node";
const NSFW_MODULE = "nsfwjs";

async function getModel(): Promise<NSFWModel | null> {
  if (!ENABLED) return null;

  if (!modelPromise) {
    modelPromise = (async () => {
      const [nsfwjs] = await Promise.all([import(NSFW_MODULE)]);
      if (!tfPromise) {
        tfPromise = import(TFJS_MODULE);
      }
      await tfPromise;
      return nsfwjs.load() as unknown as NSFWModel;
    })().catch((err) => {
      logEvent(
        "nsfw.model_load_failed",
        { error: err instanceof Error ? err.message : String(err) },
        { level: "error" }
      );
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

/**
 * Précharge le modèle au démarrage (optionnel). Appelé depuis un
 * healthcheck ou au premier hit pour éviter la latence du lazy load.
 */
export async function warmupNsfw() {
  try {
    await getModel();
  } catch {
    // log déjà émis dans getModel
  }
}

export type NsfwResult = {
  safe: boolean;
  scores: Record<string, number>;
  reason?: string;
};

/**
 * Classifie un buffer image. Si le modèle n'est pas chargé (désactivé ou
 * erreur), retourne `safe: true` pour ne pas bloquer un upload légitime —
 * la modération communautaire via `content_reports` reste le second filet.
 */
export async function classifyImage(buffer: Buffer): Promise<NsfwResult> {
  if (!ENABLED) {
    return { safe: true, scores: {}, reason: "check_disabled" };
  }

  let model: NSFWModel | null;
  try {
    model = await getModel();
  } catch {
    return { safe: true, scores: {}, reason: "model_unavailable" };
  }
  if (!model) return { safe: true, scores: {}, reason: "check_disabled" };

  if (!tfPromise) tfPromise = import(TFJS_MODULE);
  const tf = await tfPromise;

  // tf.node.decodeImage gère JPEG/PNG/WebP/BMP/GIF
  const image = tf.node.decodeImage(buffer, 3);
  try {
    const predictions = await model.classify(image);
    const scores: Record<string, number> = {};
    for (const p of predictions) {
      scores[p.className] = p.probability;
    }

    const pornScore = scores.Porn ?? 0;
    const hentaiScore = scores.Hentai ?? 0;
    const unsafe = pornScore > BLOCK_THRESHOLD || hentaiScore > BLOCK_THRESHOLD;

    return {
      safe: !unsafe,
      scores,
      reason: unsafe
        ? pornScore > hentaiScore
          ? "porn"
          : "hentai"
        : undefined,
    };
  } finally {
    // Libère la mémoire GPU/CPU allouée par TensorFlow
    (image as unknown as { dispose: () => void }).dispose();
  }
}
