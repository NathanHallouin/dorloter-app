import { EventEmitter } from "node:events";

/**
 * Bus d'events in-process pour découpler les domaines.
 *
 * Philosophie : chaque domaine émet des **faits métier** accomplis
 * (`lost-found.report_resolved`, `adoption.application_accepted`) sans
 * savoir qui écoute. D'autres domaines s'abonnent via leur `listeners.ts`.
 *
 * In-process uniquement. Pour scaler horizontalement (plusieurs replicas
 * Next.js qui doivent voir les mêmes events), remplacer l'implémentation
 * par Redis pub/sub avec la même API externe.
 *
 * Garanties :
 *   - Les handlers sont exécutés de façon asynchrone (pas bloquants pour
 *     le publisher). Les erreurs sont loggées, pas propagées — un publish
 *     ne doit JAMAIS faire échouer sa server action si un listener plante.
 *   - L'ordre d'appel des handlers est celui de l'enregistrement. Pas
 *     d'ordonnancement cross-handler à compter, garder les handlers
 *     indépendants.
 *
 * Singleton via `globalThis` pour survivre aux rechargements Turbopack
 * en dev (sinon chaque HMR crée un nouveau bus et les listeners
 * précédents sont orphelins).
 */

export interface DomainEvent {
  readonly type: string;
}

type GlobalCache = { __miaouEventBus?: EventEmitter };
const globalCache = globalThis as unknown as GlobalCache;

function getBus(): EventEmitter {
  if (!globalCache.__miaouEventBus) {
    const bus = new EventEmitter();
    bus.setMaxListeners(1_000);
    globalCache.__miaouEventBus = bus;
  }
  return globalCache.__miaouEventBus;
}

export function publish<E extends DomainEvent>(event: E): void {
  getBus().emit(event.type, event);
}

export function subscribe<E extends DomainEvent = DomainEvent>(
  type: E["type"],
  handler: (event: E) => void | Promise<void>
): () => void {
  const bus = getBus();
  const wrapped = (event: E) => {
    Promise.resolve(handler(event)).catch((err: unknown) => {
      console.error(
        `[event-bus] handler error for "${String(type)}":`,
        err
      );
    });
  };
  bus.on(type, wrapped as (e: E) => void);
  return () => {
    bus.off(type, wrapped as (e: E) => void);
  };
}
