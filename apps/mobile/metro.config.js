/**
 * Metro bundler — configuration monorepo-aware.
 *
 * En mode hoisted (bunfig.toml `linker = "hoisted"`), tous les packages
 * sont symlinkés dans `<root>/node_modules`, donc la résolution Node
 * standard remonte la chaîne et trouve tout. On a juste besoin de :
 *
 *   1. AJOUTER `workspaceRoot` aux `watchFolders` existants — Metro
 *      reconstruit quand `packages/*` ou la racine changent.
 *   2. AJOUTER les deux `nodeModulesPaths` (apps/mobile + root) sans
 *      remplacer les defaults Expo.
 *
 * On ne désactive plus `disableHierarchicalLookup` (= false par défaut)
 * pour rester aligné avec ce qu'expo-doctor attend.
 */

const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
