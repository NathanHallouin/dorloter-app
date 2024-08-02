/**
 * Barrel re-exports stables du shared kernel.
 * Primitives sans logique métier : UI, utils, validation, types.
 *
 * Règle : `shared/` n'importe que des libs externes ou Node. Zéro import
 * de `domains/`, `infrastructure/` ou `app/`.
 */
export * from "./utils";
