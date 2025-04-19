# Dorloter

Plateforme d'adoption et de retrouvailles d'animaux (adoption, perdus/trouvés, pensions). Voir [CLAUDE.md](CLAUDE.md) pour le détail du produit et de l'architecture.

Le projet est un monorepo :

- `apps/api` · API REST **NestJS (le service API)** (port `8080`, schéma PostgreSQL `dorloter_api`)
- `apps/web` · front **React + Vite** (port `5173`) qui consomme l'API

## Prérequis

- **Docker** + Docker Compose (PostgreSQL/PostGIS + MinIO)
- **NestJS 10 SDK** pour l'API (https://dot.net)
- **Bun** (ou Node 20+) pour le front

## Démarrage (3 étapes)

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

- L'API écoute sur **http://localhost:8080** (base des routes : `/api/v1`).
- Les **migrations de schéma** (`dorloter_api`) sont appliquées automatiquement au démarrage (`DatabaseMigrator` ; compatible avec un schéma déjà géré par Flyway, qu'il ne rejoue pas).
- Connexion DB par défaut : `Host=localhost;Port=5438;Database=miaou;Username=miaou;Password=miaou` (surchargeable via `ConnectionStrings__Default`).
- Vérifier que c'est lancé : `curl http://localhost:8080/api/v1/health`.

### 3. Front (Vite)

Dans un autre terminal :

```bash
cd apps/web
bun install      # première fois seulement
bun dev
```

- Le front est servi sur **http://localhost:5173**.
- En dev, Vite **proxifie `/api` vers `http://localhost:8080`** (pas de souci de CORS). La cible est configurable via `VITE_API_PROXY` (voir `apps/web/.env.example`).

## Comptes de test

Des comptes de démonstration (adoptants, équipe refuge avec rôles, pensions, vétérinaire) sont listés dans **[COMPTES-TEST.md](COMPTES-TEST.md)** · mot de passe commun : `motdepasse12`.

## Tests & build

```bash
# API : tests d'intégration (Testcontainers PostGIS, nécessite Docker)
cd apps/api && bun run test

# Front : typecheck + build de production
cd apps/web && bun run build
```

## Arrêter

```bash
docker compose down        # stoppe la base et MinIO (les données sont conservées)
docker compose down -v     # + supprime les volumes (réinitialise la base)
```
