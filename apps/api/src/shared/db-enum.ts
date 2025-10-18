/**
 * Valeurs d'enum stockées en `varchar` + CHECK (convention du projet). Les
 * colonnes enum sont lues comme des chaînes (valeur métier française, ex. "chat",
 * "disponible") et réémises telles quelles dans les DTOs.
 *
 * Ce module fournit les jeux de valeurs autorisés et des validateurs qui
 * distinguent la provenance de la valeur : un filtre de query-string invalide
 * lève `INVALID_PARAM`, un champ de corps invalide lève `VALIDATION_FAILED`, et
 * une valeur validée dans un service lève `UNPROCESSABLE`.
 */

import { AppError } from './app-error';

export const SPECIES = ['chat', 'chien'] as const;
export const SEX = ['male', 'femelle', 'inconnu'] as const;
export const AGE_CATEGORY = ['chaton', 'jeune', 'adulte', 'senior'] as const;
export const HOUSING_TYPE = ['appartement', 'maison', 'autre'] as const;
export const PET_STATUS = ['pre_adoptable', 'disponible', 'reserve', 'adopte', 'retire'] as const;
export const COMPATIBILITY = ['oui', 'non', 'inconnu'] as const;
export const FIV_FELV = [
  'negatif',
  'fiv_positif',
  'felv_positif',
  'fiv_felv_positif',
  'non_teste',
] as const;
export const APPLICATION_STATUS = [
  'envoyee',
  'en_cours',
  'acceptee',
  'refusee',
  'annulee',
] as const;
export const REPORT_TYPE = ['perdu', 'trouve'] as const;
export const REPORT_STATUS = ['actif', 'resolu', 'expire'] as const;
export const BOOKING_STATUS = ['confirmee', 'refusee', 'annulee'] as const;
export const DEVICE_PLATFORM = ['ios', 'android'] as const;
export const CONTENT_TYPE = ['pet', 'report', 'shelter', 'user'] as const;
export const CONTENT_RESOLVE_STATUS = ['masque', 'rejete'] as const;
export const CONTRACT_TYPE = ['adoption', 'foster'] as const;
export const CONTRACT_STATUS = [
  'brouillon',
  'envoye',
  'signe',
  'active',
  'terminee',
  'resilie',
  'annule',
] as const;
export const HEALTH_EVENT_TYPE = [
  'vaccin',
  'vermifuge',
  'antiparasitaire',
  'sterilisation',
  'test_fiv_felv',
  'visite',
  'traitement',
  'pesee',
  'autre',
] as const;
export const INTAKE_ORIGIN = [
  'abandon',
  'errance',
  'transfert',
  'saisie',
  'naissance',
  'autre',
] as const;
export const OUTCOME_TYPE = [
  'adoption',
  'transfert',
  'deces',
  'retour_proprietaire',
  'euthanasie',
  'autre',
] as const;
export const VOLUNTEER_STATUS = ['candidate', 'active', 'inactive'] as const;
export const SHIFT_KIND = [
  'permanence',
  'promenade',
  'nettoyage',
  'accueil',
  'transport',
  'autre',
] as const;
export const SIGNUP_STATUS = ['inscrit', 'present', 'absent'] as const;
export const EVENT_TYPE = [
  'collecte',
  'journee_adoption',
  'porte_ouverte',
  'marche',
  'sensibilisation',
  'autre',
] as const;
export const INVENTORY_CATEGORY = [
  'alimentation',
  'litiere',
  'medical',
  'materiel',
  'autre',
] as const;
export const CAMPAIGN_AUDIENCE = ['benevoles', 'abonnes', 'tous'] as const;
export const TEMPLATE_CATEGORY = ['acceptation', 'refus', 'infos', 'rdv', 'generique'] as const;
export const FOLLOWUP_STATUS = ['a_faire', 'fait', 'annule'] as const;

type Allowed = readonly string[];

function contains(allowed: Allowed, value: string): boolean {
  return allowed.includes(value);
}

/**
 * Valide une valeur d'énumération métier depuis un service ; invalide ->
 * UNPROCESSABLE. Message : « Valeur de {label} invalide : {value} ».
 */
export function ensureValue(value: string, allowed: Allowed, label: string): string {
  if (contains(allowed, value)) return value;
  throw AppError.unprocessable(`Valeur de ${label} invalide : ${value}`);
}

/**
 * Valide un filtre enum textuel optionnel (query-string) : absent/vide -> `null`,
 * valeur connue -> la valeur, valeur inconnue -> `INVALID_PARAM`.
 */
export function validateFilter(
  value: string | null | undefined,
  allowed: Allowed,
): string | null {
  if (value === null || value === undefined || value.trim() === '') return null;
  if (contains(allowed, value)) return value;
  throw AppError.invalidParam(`Valeur de filtre invalide : ${value}`);
}

/**
 * Valide un enum optionnel dans le CORPS d'une requête : absent/vide -> `null`,
 * valeur connue -> la valeur, valeur inconnue -> `VALIDATION_FAILED` sur le champ.
 */
export function bodyEnumOpt(
  value: string | null | undefined,
  allowed: Allowed,
  field: string,
): string | null {
  if (value === null || value === undefined || value.trim() === '') return null;
  if (contains(allowed, value)) return value;
  throw fieldError(field, 'Valeur invalide.');
}

/** Comme [[bodyEnumOpt]] mais le champ est obligatoire (absent -> VALIDATION_FAILED). */
export function bodyEnumReq(
  value: string | null | undefined,
  allowed: Allowed,
  field: string,
): string {
  const parsed = bodyEnumOpt(value, allowed, field);
  if (parsed === null) throw fieldError(field, 'Valeur requise.');
  return parsed;
}

function fieldError(field: string, message: string): AppError {
  return AppError.validationFailed('Données invalides.', { [field]: message });
}
