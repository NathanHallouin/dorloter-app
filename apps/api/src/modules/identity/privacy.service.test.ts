/**
 * Garde-fou de complétude de l'effacement RGPD (art. 17).
 *
 * Le risque réel n'est pas que la suppression cesse de fonctionner : c'est
 * qu'une migration ajoute une table rattachée à `users` et que le chemin
 * d'anonymisation l'oublie, laissant survivre des données personnelles d'un
 * compte pourtant « supprimé ». Ce bug est silencieux et ne casse aucun test
 * fonctionnel.
 *
 * Ce test compare donc deux sources de vérité qui doivent rester alignées :
 * les clés étrangères NOT NULL vers `users` déclarées dans les migrations, et
 * les tables effectivement traitées par `privacy.service.ts`. Il ne touche pas
 * la base : c'est une vérification statique, qui tourne en CI sans Postgres.
 *
 * Une nouvelle table rattachée à un utilisateur doit donc, au choix :
 *   - être purgée dans `deleteAccount` (cas général), ou
 *   - être ajoutée à `INTENTIONALLY_RETAINED` avec sa justification légale.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'migrations');
const PRIVACY_SERVICE = join(__dirname, 'privacy.service.ts');

/**
 * Tables volontairement conservées après un effacement, avec leur justification.
 * Elles sont en ON DELETE RESTRICT côté schéma : la ligne `users` survit alors,
 * vidée de toute donnée identifiante (chemin « anonymise »).
 */
const INTENTIONALLY_RETAINED: Record<string, string> = {
  contracts: "contrat d'adoption signé · pièce justificative conservée 5 ans",
  adoption_followups: 'suivi post-adoption rattaché à un contrat conservé',
};

/**
 * Relève les tables portant une colonne NOT NULL qui référence `users`.
 * Les références nullables (ON DELETE SET NULL) sont ignorées : elles désignent
 * un utilisateur depuis le contenu d'un tiers (auteur d'un message, modérateur)
 * et se neutralisent d'elles-mêmes.
 */
function tablesWithMandatoryUserReference(): Map<string, string> {
  const found = new Map<string, string>();

  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    let currentTable: string | null = null;

    for (const rawLine of sql.split('\n')) {
      const line = rawLine.trim();

      const created = /^CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)/i.exec(line);
      if (created?.[1]) currentTable = created[1];

      const altered = /^ALTER TABLE ([a-z_]+)/i.exec(line);
      if (altered?.[1]) currentTable = altered[1];

      const references =
        /NOT NULL\s+REFERENCES\s+(?:dorloter_api\.)?users\s*\(\s*id\s*\)/i.test(line);
      if (references && currentTable) found.set(currentTable, file);
    }
  }

  return found;
}

/** Tables citées dans un `deleteFrom('…')` du service de confidentialité. */
function tablesPurgedByService(): Set<string> {
  const source = readFileSync(PRIVACY_SERVICE, 'utf8');
  const purged = new Set<string>();
  for (const match of source.matchAll(/deleteFrom\('([a-z_]+)'\)/g)) {
    if (match[1]) purged.add(match[1]);
  }
  return purged;
}

describe('complétude de la suppression de compte', () => {
  test('les migrations exposent bien des tables rattachées à users', () => {
    // Garde-fou du garde-fou : si le relevé revient vide, c'est que le format
    // des migrations a changé et que le test ne vérifie plus rien.
    expect(tablesWithMandatoryUserReference().size).toBeGreaterThan(10);
  });

  test('chaque table rattachée à un utilisateur est purgée ou conservée sciemment', () => {
    const purged = tablesPurgedByService();
    const oublis: string[] = [];

    for (const [table, migration] of tablesWithMandatoryUserReference()) {
      if (table === 'users') continue; // la ligne elle-même, traitée à part
      if (purged.has(table)) continue;
      if (table in INTENTIONALLY_RETAINED) continue;
      oublis.push(`${table} (introduite par ${migration})`);
    }

    expect(oublis).toEqual([]);
  });

  test('les tables conservées le sont pour une raison documentée', () => {
    for (const [table, raison] of Object.entries(INTENTIONALLY_RETAINED)) {
      expect(raison.length).toBeGreaterThan(20);
      expect(table).toMatch(/^[a-z_]+$/);
    }
  });
});
