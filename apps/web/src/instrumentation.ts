/**
 * Hook Next.js `register()` — exécuté une fois au démarrage du serveur,
 * avant toute requête. Cas d'usage : enregistrer les listeners cross-domain
 * sur l'event bus. Si on les enregistrait paresseusement au premier publish,
 * les premiers events pourraient arriver avant que le handler soit prêt.
 *
 * Vérifier `process.env.NEXT_RUNTIME === "nodejs"` : Next.js appelle aussi
 * register() côté edge runtime (Cloudflare Workers, etc.) où node:events
 * n'existe pas.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  await Promise.all([
    import("@gamification/listeners"),
    import("@notifications/listeners"),
    import("@veterinarians/listeners"),
    import("@notifications/guetteur-listener"),
  ]);
}
