/**
 * Règles de frontière de l'architecture modulaire Miaou.
 *
 * Couches (du bas vers le haut) :
 *   shared/          primitives, zéro métier, importe uniquement libs externes
 *   infrastructure/  plomberie (db, auth, storage, email, push, event-bus)
 *                    peut importer shared/, pas de domain/
 *   domains/X/       bounded context, importe shared/, infrastructure/,
 *                    et UNIQUEMENT public.ts / events.ts / schema.ts des autres domaines
 *   app/             orchestration Next.js (routes, layouts) — importe n'importe quoi
 *                    dans le respect des APIs publiques des domaines
 *
 * Exception : `src/instrumentation.ts` (hook Next.js de démarrage serveur)
 * charge les listeners cross-domain — c'est par nature un module de bootstrap
 * qui vit au-dessus des couches.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "shared-cannot-import-upstream",
      severity: "error",
      comment:
        "shared/ est le socle : pas d'import de domains/, infrastructure/, app/.",
      from: { path: "^src/shared/" },
      to: { path: "^src/(domains|infrastructure|app)/" },
    },
    {
      name: "infrastructure-cannot-import-domain-or-app",
      severity: "error",
      comment:
        "infrastructure/ est agnostique au métier : pas d'import de domains/ ou app/.",
      from: { path: "^src/infrastructure/" },
      to: { path: "^src/(domains|app)/" },
    },
    {
      name: "cross-domain-must-use-public-surface",
      severity: "error",
      comment:
        "Un domaine ne peut importer un autre domaine qu'à travers public.ts, events.ts ou schema.ts.",
      from: { path: "^src/domains/([^/]+)/" },
      to: {
        path: "^src/domains/",
        pathNot: [
          "^src/domains/$1/",
          "^src/domains/[^/]+/(public|public\\.client|events|schema)\\.ts$",
        ],
      },
    },
    {
      name: "app-must-use-public-surface-of-domain",
      severity: "error",
      comment:
        "app/ ne peut importer un domaine qu'à travers public.ts, events.ts ou schema.ts.",
      from: { path: "^src/app/" },
      to: {
        path: "^src/domains/",
        pathNot: ["^src/domains/[^/]+/(public|public\\.client|events|schema)\\.ts$"],
      },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Module jamais importé — probablement du code mort.",
      from: {
        orphan: true,
        pathNot: [
          // Entry points Next.js + TS configs + scripts
          "(^|/)(next|drizzle|postcss|tailwind|eslint)\\.config\\.[cm]?[tj]sx?$",
          "^next-env\\.d\\.ts$",
          "^src/app/",
          "^src/instrumentation\\.ts$",
          "^src/proxy\\.ts$",
          "^src/types/",
          "^scripts/",
          "^public/",
          "^tests?/",
          "^\\.dependency-cruiser\\.cjs$",
          // Helpers volontairement conservés pour usage futur (MVP)
          "^src/shared/utils/geo\\.ts$",
          "^src/shared/ui/sonner\\.tsx$",
          "^src/hooks/use-geolocation\\.ts$",
        ],
      },
      to: {},
    },
    {
      name: "no-circular-outside-schema",
      severity: "error",
      comment:
        "Cycles d'imports interdits — SAUF entre schema.ts des domaines et " +
        "le barrel `src/server/db/schema.ts`, qui les utilise volontairement " +
        "via les callbacks Drizzle lazy (`() => otherTable.id`). Le cycle " +
        "est sûr car les références sont résolues au moment de la query, " +
        "pas au chargement du module.",
      from: { pathNot: "^(src/server/db/schema\\.ts|src/domains/[^/]+/schema\\.ts)$" },
      to: {
        circular: true,
        pathNot: "^(src/server/db/schema\\.ts|src/domains/[^/]+/schema\\.ts)$",
      },
    },
  ],

  options: {
    doNotFollow: {
      path: ["node_modules", "\\.next", "dist", "build"],
    },

    includeOnly: "^src/",

    tsConfig: {
      fileName: "tsconfig.json",
    },

    // Sans ça, `import type { ... }` est ignoré (TypeScript l'efface au
    // build). Résultat : events.ts apparaît comme orphan alors qu'il est
    // bien importé par les listeners.
    tsPreCompilationDeps: true,

    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["main", "types"],
    },

    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
