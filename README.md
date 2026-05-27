# Dorloter

Plateforme française d'adoption et de retrouvailles d'animaux domestiques.
Monorepo TypeScript : une API NestJS, deux SPA React, une application mobile
Expo, PostgreSQL/PostGIS, auto-hébergeable sur un VPS européen.

Projet solo, périmètre MVP livré. Code en TypeScript strict, interface et
commentaires en français.

`NestJS 11` · `Kysely` · `PostgreSQL 18 + PostGIS` · `React 19` · `Vite` ·
`TanStack Query` · `Tailwind v4` · `Expo` · `Docker` · `Caddy`

## Le produit

**Adoption.** Vitrine des refuges et fiches animaux, catalogue filtrable, swipe
et quiz de compatibilité, candidatures en ligne. Côté refuge, un back-office
complet : registre légal d'entrée et de sortie, contrats, familles d'accueil,
suivi médical, bénévoles, stock.

**Perdus et trouvés.** Signalements géolocalisés sur carte, avec rapprochement
automatique entre un animal perdu et les animaux trouvés à proximité.

**Pensions.** Annuaire de pensions professionnelles agréées, avec demandes de
réservation et avis.

## Architecture

```
                          ┌────────────────────────────────────┐
   dorloter.fr ──────────▶│  apps/web     SPA React + Vite     │──┐
                          └────────────────────────────────────┘  │
                          ┌────────────────────────────────────┐  │
   pro.dorloter.fr ──────▶│  apps/pro     SPA React + Vite     │──┤  @dorloter/ui
                          └────────────────────────────────────┘  │  @dorloter/client
                          ┌────────────────────────────────────┐  │
   iOS / Android ────────▶│  apps/mobile  Expo / React Native  │──┤  @dorloter/api-client
                          └────────────────────────────────────┘  │
                                                                  │
                                                     ┌────────────▼──────────────┐
                                                     │  apps/api      /api/v1    │
                                                     │  NestJS · monolithe       │
                                                     │  modulaire (9 contextes)  │
                                                     └────────────┬──────────────┘
                                                                  │ Kysely (SQL-first)
                                                     ┌────────────▼──────────────┐
                                                     │  PostgreSQL 18 + PostGIS  │
                                                     │  schéma dorloter_api      │
                                                     └───────────────────────────┘
```

```
apps/
  api/         API REST NestJS (Kysely + PostGIS) · monolithe modulaire · :8080 · /api/v1
  web/         SPA publique (vitrine adoptants) · React 19 + Vite · :5173
  pro/         SPA espace pro (consoles refuge/pension + admin) · :5174
  mobile/      App Expo / React Native · consomme /api/v1
packages/
  ui/          Design system partagé (primitives, Icon, thème) · web + pro
  client/      Couche API partagée (client JWT + refresh, types, auth) · web + pro
  api-client/  Client openapi-fetch typé (mobile), généré depuis l'OpenAPI
docs/          Documentation technique, produit et design
scripts/       Génération de types, build/déploiement mobile, ops prod
```

| Composant | Stack | Détail |
|---|---|---|
| API | NestJS 11, Kysely, PostGIS, JWT, OpenAPI | [apps/api](apps/api/README.md) |
| Web (public) | React 19, Vite, React Router, TanStack Query, Tailwind v4, MapLibre | [apps/web](apps/web/README.md) |
| Pro (back-office) | React 19, Vite · `pro.dorloter.fr` | [apps/pro](apps/pro/README.md) |
| Mobile | Expo, React Native, MapLibre | [apps/mobile](apps/mobile/README.md) |
| Design system | primitives partagées web + pro | [packages/ui](packages/ui) |
| Couche API | client HTTP + types + auth, web + pro | [packages/client](packages/client) |
| Client API typé | openapi-fetch (mobile, généré) | [packages/api-client](packages/api-client/README.md) |

En production, Caddy sert les deux SPA en statique, termine le TLS et proxifie
`/api/v1` vers l'API. Les images vivent sur un stockage S3-compatible (MinIO en
dev, OVH ou Scaleway en prod).

## Choix techniques

**Le rapprochement perdu / trouvé est en PostGIS.** À chaque signalement créé,
l'API cherche les signalements du type opposé dans un rayon de 30 km et calcule
un score sur 100 : distance géodésique (40 points), couleur du pelage (25), race
(15), sexe (10), fenêtre temporelle (10). Au-delà de 40, la correspondance est
proposée. Le géo est en SQL natif (`ST_DWithin`, `ST_Distance` sur
`::geography`) ; le scoring, lui, est une fonction pure, donc testable sans base.

**Pas d'ORM.** Kysely donne des requêtes typées à la compilation sans s'interposer
entre le code et le SQL, ce qui compte quand une bonne partie des requêtes est
géospatiale. Le schéma est décrit dans
[`schema.ts`](apps/api/src/infra/database/schema.ts) et les migrations restent
des fichiers `.sql` versionnés, appliqués au démarrage.

**Deux fronts, un seul socle.** La vitrine adoptants et le back-office pro ont
des besoins d'UX opposés, donc deux SPA sur deux domaines. Elles partagent le
design system (`@dorloter/ui`) et la couche d'accès API (`@dorloter/client`) : la
séparation coûte deux points d'entrée, pas deux codebases.

**L'autorisation refuge passe par l'équipe, pas par le rôle du token.** Un
bénévole invité dans un refuge a le rôle JWT global `user`. Les accès au
back-office sont donc résolus via l'appartenance à l'équipe et une matrice de
permissions fines (`pets:write`, `applications:read`…).

**Un contrat d'API stable.** Enveloppes `{data}`, `{data, pagination}` et
`{error: {code, message}}`, codes d'erreur figés, pagination par curseur keyset.
Ce contrat et le format des hashes de mots de passe n'ont pas bougé depuis
l'origine, donc les trois clients (web, pro, mobile) restent alignés sans
régénération.

## Démarrage rapide

**Prérequis** : Docker + Docker Compose, et Bun (ou Node 20+).

```bash
bun install                  # une seule fois, à la racine (bun workspaces)
```

Puis, chaque service dans son terminal :

| # | Service | Commande | URL |
|---|---|---|---|
| 1 | Base de données + MinIO | `docker compose up -d` | Postgres `:5438` · MinIO `:9000` (console `:9001`) |
| 2 | API NestJS | `cd apps/api && bun dev` | http://localhost:8080 · `/api/v1` |
| 3 | Front public | `cd apps/web && bun dev` | http://localhost:5173 |
| 4 | Front pro | `cd apps/pro && bun dev` | http://localhost:5174 |

Une fois l'API démarrée (elle crée le schéma), peupler la base de démo :

```bash
bun db:seed      # scripts/seed.sql, idempotent
```

Comptes de test · mot de passe commun `motdepasse12` · par exemple
`camille.roussel@dorloter.fr` (console refuge) ou `lea.marchand@dorloter.fr`
(adoptante). Liste complète : [docs/COMPTES-TEST.md](docs/COMPTES-TEST.md).

<details>
<summary>Détail de chaque étape, mobile, client typé, arrêt</summary>

### 1. Base de données (+ stockage MinIO)

```bash
docker compose up -d
```

- **PostgreSQL 18 + PostGIS** sur `localhost:5438` (base `dorloter`, user/mdp `dorloter` / `dorloter`)
- **MinIO** (stockage S3) sur `localhost:9000`, console sur `localhost:9001` (`minioadmin` / `minioadmin`)

### 2. API

```bash
cd apps/api && bun dev
```

Les migrations du schéma `dorloter_api` sont appliquées automatiquement au
démarrage (migrateur maison, `.sql` de `apps/api/migrations`).
Vérifier : `curl http://localhost:8080/api/v1/health`.

### 3. Fronts

Les deux SPA proxifient `/api` vers `http://localhost:8080` en dev, donc pas de
CORS à gérer. Depuis la racine, `bun dev` est un raccourci qui lance uniquement
la vitrine publique.

### 4. Mobile (optionnel)

```bash
cd apps/mobile && bun start     # Expo · voir apps/mobile/README.md pour dev-client / EAS
```

### Client API typé

```bash
bun api:types    # régénère packages/api-client/src/types.gen.ts depuis /api/v1/openapi
```

L'OpenAPI servi est encore partiel ; le client committé reste valide (contrat
identique), donc ne pas régénérer tant que l'annotation n'est pas complète.

### Arrêter

```bash
docker compose down        # stoppe la base et MinIO (données conservées)
docker compose down -v     # + supprime les volumes (réinitialise la base)
```

</details>

## Tests et qualité

```bash
bun run typecheck            # tsc --noEmit sur les 7 workspaces
bun run build                # build de production de tous les workspaces
cd apps/api && bun test src  # tests unitaires (interop scrypt, scoring du matching)
```

TypeScript strict partout. Les tests unitaires couvrent les deux endroits où une
régression passerait inaperçue : le format des hashes de mots de passe et le
scoring du matching. Les flux métier sont exercés de bout en bout contre une base
PostGIS.

CI GitHub Actions (portable vers Forgejo/Codeberg) : typecheck, build, tests et
build de l'image Docker de l'API sur chaque PR.

## Ce qui reste à faire

- **Upload d'images** : le presign S3/MinIO n'est pas encore côté API.
- **Email transactionnel** : gabarits et déclencheurs en place, transport SMTP à
  brancher (l'émetteur est un no-op loggé).
- **Web Push** : le centre de notifications in-app existe, le push navigateur non.
- **OpenAPI** : le document décrit le contrat mais n'énumère pas encore chaque
  route.

## Déploiement

Un seul `docker-compose.prod.yml` sur un VPS européen : `postgres` (PostGIS),
`minio`, `api`, `web`, `pro`, `caddy`. L'API applique ses migrations au
démarrage, via une connexion DDL dédiée (le rôle applicatif n'a pas les
privilèges DDL en production).

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/ENV.md](docs/ENV.md) et
`.env.production.example`.

## Documentation

| | |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Source de vérité : produit, stack, modèle de données, conventions |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture de référence détaillée |
| [docs/](docs/README.md) | Contrat d'API, déploiement, variables d'env, roadmap, design |
