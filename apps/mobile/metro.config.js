/**
 * Metro bundler — configuration monorepo-aware.
 *
 * Trois ajustements indispensables pour qu'Expo résolve correctement les
 * workspaces bun :
 *
 *   1. `watchFolders` inclut la racine du monorepo pour que Metro
 *      reconstruise quand `packages/*` changent.
 *   2. `resolver.nodeModulesPaths` liste les deux `node_modules`
 *      possibles (apps/mobile et root) — Metro ne fait pas le hoist tout
 *      seul.
 *   3. `disableHierarchicalLookup` empêche Metro de remonter au-dessus
 *      du monorepo (sinon il trouve des copies parasites quand on
 *      travaille dans un répertoire utilisateur déjà parent d'autres
 *      projets Node).
 */

const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
