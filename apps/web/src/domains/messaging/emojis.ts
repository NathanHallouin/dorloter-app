/**
 * Whitelist d'emojis autorisés pour les réactions. Volontairement limitée
 * à 10 pour garder une UX propre et éviter le bruit (on ne veut pas qu'on
 * réagisse 🍆 à une annonce de chat).
 *
 * Voir docs/MESSAGING.md § « Whitelist des emojis de réaction ».
 */

export const ALLOWED_EMOJIS = [
  "🙏",
  "❤️",
  "👍",
  "👎",
  "😂",
  "😢",
  "🎉",
  "🐾",
  "🔥",
  "✅",
] as const;

export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_EMOJIS);

export function isAllowedEmoji(value: string): value is AllowedEmoji {
  return ALLOWED_SET.has(value);
}
