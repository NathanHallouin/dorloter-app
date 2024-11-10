/**
 * NSFW — stub no-op pour le déploiement prototype.
 *
 * En proto (Vercel), on n'embarque pas `@tensorflow/tfjs-node` (387 Mo)
 * ni `nsfwjs` (41 Mo) — la fonction serverless dépasserait la limite de
 * 250 Mo. La modération photos passe par les reports communautaires
 * (table `content_reports`) gérés via le back-office admin.
 *
 * Quand le projet sera auto-hébergé sur VPS (voir docs/DEPLOYMENT.md),
 * on remettra la vraie implémentation tfjs + nsfwjs ici. Le contrat
 * d'API (`classifyImage`, `warmupNsfw`, `NsfwResult`) reste inchangé.
 */

export type NsfwResult = {
  safe: boolean;
  scores: Record<string, number>;
  reason?: string;
};

export async function warmupNsfw(): Promise<void> {
  // no-op
}

export async function classifyImage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _buffer: Buffer
): Promise<NsfwResult> {
  return { safe: true, scores: {}, reason: "check_disabled" };
}
