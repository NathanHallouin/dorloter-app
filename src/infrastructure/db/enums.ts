import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums PG partagés entre plusieurs domaines.
 *
 * Ces définitions vivent en dehors des `domains/` parce qu'elles sont
 * utilisées **eagerly** dans la déclaration des colonnes (ex. `sex: sexEnum()`),
 * donc doivent être chargées avant l'évaluation de n'importe quel schema
 * qui les consomme. Les garder dans `server/db/schema.ts` créait une TDZ
 * au chargement de `adoption/schema.ts` (qui importe `sexEnum` avant que la
 * ligne `const sexEnum = ...` du barrel n'ait exécuté).
 *
 * Un enum qui n'est utilisé que par un seul domaine reste chez lui.
 */

export const sexEnum = pgEnum("sex", ["male", "femelle", "inconnu"]);
