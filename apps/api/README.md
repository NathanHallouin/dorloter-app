# API Dorloter · NestJS

API REST du projet Dorloter : adoption, perdus/trouvés (matching PostGIS), pensions,
back-office refuge. Toutes les routes sont sous `/api/v1`, port 8080.

Stack : **NestJS 11** (Express) · **Kysely** + `pg` (SQL-first, pas d'ORM) ·
**PostgreSQL 18 + PostGIS** (schéma `dorloter_api`) · **JWT HS256** ·
**class-validator**.

## Démarrer

Depuis la racine du monorepo, la base doit tourner (`docker compose up -d`), puis :

```bash
cd apps/api
bun dev            # nest start --watch · migre le schéma au démarrage
curl http://localhost:8080/api/v1/health
```

Les valeurs par défaut de dev sont dans `src/config.ts` (DB sur `:5438`, secret JWT
de dev, email no-op). Aucun `.env` n'est nécessaire en local. Voir
[docs/ENV.md](../../docs/ENV.md) pour la prod.

## Scripts

```bash
bun dev            # dev avec rechargement
bun run build      # nest build -> dist/ (+ copie de migrations/)
bun start          # node dist/main.js
bun run typecheck  # tsc --noEmit
bun test src       # tests unitaires (interop scrypt, scoring du matching)
```

Image de prod (contexte autonome, migrations incluses) :

```bash
docker build -t dorloter-api apps/api
```

## Organisation

```
src/
├── modules/          # Bounded contexts : identity, shelters, adoption, lostfound,
│                     #   pensions, notifications, messaging, gamification, moderation
├── shared/           # app-error, api-response (ok/page), cursor, db-enum, validation, format
├── infra/
│   ├── database/     # Kysely (schema.ts) + migrator (compat Flyway)
│   ├── security/     # jwt, scrypt (interop Better Auth), garde @Auth() / @CurrentUser()
│   ├── email/        # émetteur transactionnel (no-op loggé · gap SMTP) + gabarits
│   └── web/          # health, openapi
├── config.ts · config.module.ts · app.module.ts · main.ts
└── migrations/       # .sql du schéma dorloter_api, appliqués au démarrage
```

Un module expose ses providers publics via le `exports` de son `*.module.ts` : c'est
la seule porte d'entrée pour les autres modules (`ShelterDirectory`,
`ShelterMembershipService`, `UserDirectory`, `NotificationsService`).

## Contrat d'API

- Succès : `{ "data": ... }` · liste paginée : `{ "data": [...], "pagination": { "cursor", "hasMore" } }`
- Erreur : `{ "error": { "code", "message", "details"? } }` avec des codes stables
  (`VALIDATION_FAILED`, `INVALID_PARAM`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
  `CONFLICT`, `UNPROCESSABLE`, `INTERNAL_ERROR`…)
- Auth par handler : `@Auth()` protège, son absence rend l'endpoint public.
  L'autorisation refuge passe par une **permission de membre**, jamais par le rôle JWT.
- Pagination : curseur keyset opaque (Base64URL), jamais d'offset.

Document OpenAPI partiel sur `/api/v1/openapi` (l'annotation exhaustive reste à faire ·
le client typé `packages/api-client` committé reste valide, contrat identique).

## Migrations

Fichiers `.sql` numérotés `V<n>__<nom>.sql` dans `migrations/`, appliqués au démarrage
par un migrateur maison (table `dorloter_api.schema_migrations`, avec baseline
`flyway_schema_history` si la base vient de Flyway). Une connexion DDL dédiée peut être
fournie via `ConnectionStrings__Migrations` ; `Dorloter__Database__AutoMigrate=false`
désactive la migration au démarrage.
