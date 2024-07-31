/**
 * Génère les types TypeScript du client API depuis le document OpenAPI.
 *
 * Usage : bun api:types
 *
 * Sortie : `src/shared/api-client/types.gen.ts` (committé en repo).
 *
 * Cette tâche tourne hors du serveur Next : on importe `buildOpenApiDocument`
 * directement et on lance `openapi-typescript` sur le document en mémoire.
 * Pas besoin que le dev server tourne, et pas de risque que le contrat
 * soit en décalage avec ce qui est servi sur `/api/v1/openapi.json` (même
 * code source).
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";
import { buildOpenApiDocument } from "../src/infrastructure/api/openapi";

const HEADER = `/**
 * Types TypeScript du client API Dorloter — GÉNÉRÉS AUTOMATIQUEMENT.
 * Ne pas éditer à la main. Régénérer via : \`bun api:types\`.
 *
 * Source : src/infrastructure/api/openapi.ts → buildOpenApiDocument()
 */

`;

async function main(): Promise<void> {
  const document = buildOpenApiDocument("https://dorloter.fr");
  // openapi-typescript accepte un objet Document via l'API programmatique.
  const ast = await openapiTS(document as never);
  const contents = HEADER + astToString(ast);

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "../src/shared/api-client/types.gen.ts");
  await writeFile(outPath, contents, "utf8");

  // eslint-disable-next-line no-console
  console.log(`✓ Types API écrits : ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Échec génération des types API:", err);
  process.exit(1);
});
