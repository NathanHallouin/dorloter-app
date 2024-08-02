/**
 * Event bus : point d'entrée unique.
 *
 * Règle : un domaine qui PUBLIE un event importe `publish` depuis ce
 * fichier. Un domaine qui ÉCOUTE exporte un `listeners.ts` qui appelle
 * `subscribe(...)` au chargement.
 *
 * Bootstrap des listeners : chargé au démarrage serveur via
 * `src/instrumentation.ts` (hook Next.js `register()`). On évite de
 * l'importer ici pour respecter le layering : `infrastructure/` ne doit
 * pas dépendre de `domains/`.
 */

export { publish, subscribe, type DomainEvent } from "./bus";
