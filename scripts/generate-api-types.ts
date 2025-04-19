/**
 * Génère les types TypeScript du client API depuis l'OpenAPI de l'API
 * (le service API). La source de vérité du contrat est l'API (apps/api).
 *
 * Usage :
 *   1. Lancer l'API :        cd apps/api && bun dev
 *   2. Générer les types :   bun api:types
 *
 * Variable d'env optionnelle :
 *   OPENAPI_URL  (défaut : http://localhost:8080/api/v1/openapi)
 *
 * Sortie : packages/api-client/src/types.gen.ts (committé en repo).
 *
 * Le format de réponse ({ data }, { data, pagination }, { error }) et les codes
 * d'erreur sont stables : openapi-fetch et le code mobile existant continuent de
 * fonctionner sans changement.
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const OPENAPI_URL =
  process.env.OPENAPI_URL ?? "http://localhost:8080/api/v1/openapi";

const HEADER = `/**
 * Types TypeScript du client API Dorloter — GÉNÉRÉS AUTOMATIQUEMENT.
 * Ne pas éditer à la main. Régénérer via : \`bun api:types\`.
 *
 * Source : OpenAPI de l'API (le service API) servi sur /api/v1/openapi
 */

`;

async function main(): Promise<void> {
  // openapi-typescript récupère et parse le document à l'URL fournie.
  const ast = await openapiTS(new URL(OPENAPI_URL));
  const contents = HEADER + astToString(ast);

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "../packages/api-client/src/types.gen.ts");
  await writeFile(outPath, contents, "utf8");

  // eslint-disable-next-line no-console
  console.log(`✓ Types API écrits : ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Échec génération des types API:", err);
  // eslint-disable-next-line no-console
  console.error(`Vérifie que l'API tourne et expose ${OPENAPI_URL}`);
  process.exit(1);
});
