# Dorloter

Plateforme française d'adoption et de retrouvailles d'animaux domestiques : **adoption** (vitrine des refuges, candidatures), **perdus / trouvés** (signalements géolocalisés + matching PostGIS), **pensions** professionnelles agréées.

Voir [CLAUDE.md](CLAUDE.md) pour le détail produit et l'architecture, et [`docs/`](docs/README.md) pour la documentation technique et produit.

## Structure du monorepo

```
apps/
  api/         API REST NestJS (le service API) · monolithe modulaire · port 8080 · /api/v1
  web/         Front SPA React 19 + Vite · port 5173 · consomme /api/v1
  mobile/      App Expo / React Native · consomme /api/v1
packages/
  api-client/  Client openapi-fetch typé, généré depuis l'OpenAPI
docs/          Documentation technique, produit et design
scripts/       Génération de types, build/déploiement mobile, ops prod
```

| Composant | Stack | README |
|---|---|---|
| API | NestJS 10, Kysely + PostGIS, JWT, OpenAPI | [apps/api](apps/api/README.md) |
| Web | React 19, Vite, React Router, TanStack Query, Tailwind v4 | [apps/web](apps/web/README.md) |
| Mobile | Expo, React Native, MapLibre | [apps/mobile](apps/mobile/README.md) |
| Client API | openapi-fetch (typé, généré) | [packages/api-client](packages/api-client/README.md) |

Base de données : PostgreSQL 16 + PostGIS (schéma `dorloter_api`). Stockage images : S3-compatible (MinIO en dev). Reverse proxy + HTTPS en prod : Caddy.

## Prérequis

- **Docker** + Docker Compose (PostgreSQL/PostGIS + MinIO)
- **NestJS 10 SDK** pour l'API · https://dot.net
- **Bun** (ou Node 20+) pour le front, le mobile et les scripts

## Démarrage rapide

Lancer dans cet ordre : base de données, puis API, puis front.

### 1. Base de données (+ stockage MinIO)

À la racine du repo :

```bash
docker compose up -d
```

Démarre :

- **PostgreSQL 16 + PostGIS** sur `localhost:5438` (base `miaou`, user/mdp `miaou` / `miaou`)
- **MinIO** (stockage S3) sur `localhost:9000`, console sur `localhost:9001` (`minioadmin` / `minioadmin`)

### 2. API 

```bash
cd apps/api
bun dev
```

- Écoute sur **http://localhost:8080** (base des routes : `/api/v1`).
- Les migrations de schéma (`dorloter_api`) sont appliquées automatiquement au démarrage (`DatabaseMigrator`).
- Vérifier : `curl http://localhost:8080/api/v1/health`.

### 3. Front (Vite)

Dans un autre terminal :

```bash
cd apps/web
bun install      # première fois seulement
bun dev
```

- Servi sur **http://localhost:5173**. En dev, Vite proxifie `/api` vers `http://localhost:8080` (cible configurable via `VITE_API_PROXY`).

### Mobile (optionnel)

```bash
cd apps/mobile
bun install
bun start        # Expo (voir apps/mobile/README.md pour dev-client / EAS)
```

## Client API typé

Le client `packages/api-client` est généré depuis l'OpenAPI de l'API (API lancée sur `:8080`) :

```bash
bun api:types    # régénère packages/api-client/src/types.gen.ts
```

## Comptes de test

Comptes de démonstration (adoptants, équipe refuge, pensions, vétérinaire) : voir [docs/COMPTES-TEST.md](docs/COMPTES-TEST.md) · mot de passe commun `motdepasse12`.

## Tests & build

```bash
# API : tests d'intégration (Testcontainers PostGIS, nécessite Docker)
cd apps/api && bun run test

# Front : typecheck + build de production
cd apps/web && bun run build
```

## Déploiement

Production sur VPS (Hetzner / Scaleway) via Docker Compose + Caddy. Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) et `docker-compose.prod.yml`.

## Arrêter

```bash
docker compose down        # stoppe la base et MinIO (données conservées)
docker compose down -v     # + supprime les volumes (réinitialise la base)
```
