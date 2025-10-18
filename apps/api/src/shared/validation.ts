/**
 * Validation des corps de requête (class-validator) et des paramètres de
 * query-string.
 *
 * En cas d'échec sur le corps, renvoie l'enveloppe
 * `{ error: { code: "VALIDATION_FAILED", details: { fields: { champ: message } } } }`
 * avec un seul message par champ (le premier), comme le reste du contrat.
 */

import { ValidationPipe, type ValidationPipeOptions } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import { AppError } from './app-error';

/**
 * Pipe de validation global. Les DTOs portent des messages français explicites ;
 * à défaut (message par défaut de class-validator, en anglais), on retombe sur
 * « Champ « x » invalide. ».
 */
export function createValidationPipe(options: ValidationPipeOptions = {}): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidUnknownValues: false,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors: ValidationError[]) =>
      AppError.validationFailed('Données invalides.', flatten(errors)),
    ...options,
  });
}

/** Aplatit les erreurs (y compris imbriquées) en `{ champ: premier_message }`. */
function flatten(errors: ValidationError[], prefix = ''): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];
    const custom = messages.find((message) => isCustom(message, error.property));
    if (fields[path] === undefined && messages.length > 0) {
      fields[path] = custom ?? `Champ « ${error.property} » invalide.`;
    }
    if (error.children && error.children.length > 0) {
      Object.assign(fields, flatten(error.children, path));
    }
  }
  return fields;
}

/**
 * Les messages par défaut de class-validator sont en anglais et commencent
 * toujours par le nom du champ (« password must be longer than... »). Tout autre
 * message vient d'un DTO du projet : on l'expose tel quel.
 */
function isCustom(message: string, property: string): boolean {
  return !message.startsWith(`${property} `);
}

// --- Paramètres de query-string ------------------------------------------------

/** Entier optionnel d'une query-string. Valeur non numérique -> `INVALID_PARAM`. */
export function queryInt(value: unknown, name: string): number | null {
  const raw = queryString(value);
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) throw AppError.invalidParam(`Paramètre « ${name} » invalide.`);
  return parsed;
}

/** Décimal optionnel d'une query-string. Valeur non numérique -> `INVALID_PARAM`. */
export function queryFloat(value: unknown, name: string): number | null {
  const raw = queryString(value);
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) throw AppError.invalidParam(`Paramètre « ${name} » invalide.`);
  return parsed;
}

/** Booléen optionnel d'une query-string (`true` / `false`). */
export function queryBool(value: unknown, name: string): boolean | null {
  const raw = queryString(value);
  if (raw === null) return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw AppError.invalidParam(`Paramètre « ${name} » invalide.`);
}

/** Date `yyyy-mm-dd` optionnelle d'une query-string. */
export function queryDate(value: unknown, name: string): string | null {
  const raw = queryString(value);
  if (raw === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw AppError.invalidParam(`Paramètre « ${name} » invalide.`);
  }
  return raw;
}

/** Chaîne optionnelle d'une query-string ; vide et répétitions normalisées. */
export function queryString(value: unknown): string | null {
  if (Array.isArray(value)) return queryString(value[0]);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Borne une limite de pagination demandée par le client. */
export function clampLimit(limit: number | null, fallback: number, max: number): number {
  if (limit === null) return fallback;
  return Math.min(Math.max(limit, 1), max);
}
