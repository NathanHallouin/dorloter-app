/**
 * Barrel re-exports de la plomberie. Zéro logique métier ici.
 *
 * Règle : `infrastructure/` peut importer `shared/` et des libs externes.
 * Zéro import de `domains/` ou `app/`.
 */
export * from "./db";
export * from "./logger";
