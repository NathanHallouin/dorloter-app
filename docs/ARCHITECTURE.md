# Architecture Dorloter

Document d'architecture de référence. Décrit la structure **actuelle** du monorepo et les choix structurants. La source de vérité du stack et du modèle de données reste **[../CLAUDE.md](../CLAUDE.md)** ; ce document en donne la vue d'ensemble et explique le « pourquoi ».

Dorloter est une plateforme française d'**adoption** et de **retrouvailles** d'animaux domestiques (chats et chiens, extensible aux NAC), complétée d'un **annuaire de pensions professionnelles** agréées et d'un **annuaire vétérinaire**. Projet solo, MVP : on privilégie la simplicité et la vitesse de livraison à l'architecture parfaite. Pas de microservices, pas de message queue, pas de cache Redis.

---

## 1. Vue d'ensemble

Le projet est un **monorepo polyglotte** géré par **bun workspaces** (Turborepo a été retiré : un seul gestionnaire, pas de couche d'orchestration de build supplémentaire). Deux familles d'unités :

- `apps/*` : les applications déployables (API, fronts web/pro, mobile).
- `packages/*` : le code partagé entre les fronts (design system, couche d'accès API, client typé mobile).

```
dorloter/
├── apps/
│   ├── api/      # API REST NestJS (le service API) · port 8080 · /api/v1
│   ├── web/      # SPA publique (vitrine adoptants) · React 19 + Vite · port 5173 · dorloter.fr
│   ├── pro/      # SPA espace pro (back-office) · React 19 + Vite · port 5174 · pro.dorloter.fr
│   └── mobile/   # Expo / React Native
│
├── packages/
│   ├── ui/          # design system partagé (primitives, Icon, cn, thème CSS) · web + pro
│   ├── client/      # couche d'accès API partagée (HTTP JWT, types, modules, AuthContext, queryClient) · web + pro
│   └── api-client/  # client openapi-fetch typé (généré depuis l'OpenAPI) · mobile
│
├── docs/                       # documentation (ce dossier)
├── scripts/                    # outillage (seed, génération types, build mobile, prod)
├── docker-compose.yml          # dev : postgres + minio
├── docker-compose.prod.yml     # prod : postgres, minio, api, web, pro, caddy
├── Caddyfile                   # reverse proxy + TLS (edge)
└── package.json                # bun workspaces (apps/*, packages/*)
```

**Frontière de sécurité unique : l'API.** Quel que soit le front (web public, pro, mobile), toute la logique métier et toutes les autorisations vivent dans l'API. Les fronts ne sont que des consommateurs du contrat `/api/v1` ; ils n'ont aucun privilège propre.

---

## 2. L'API · `apps/api`

Le backend principal : un service **le service API** (C# / NestJS 10) organisé en **monolithe modulaire à bounded contexts**. C'est le cœur du système : tous les fronts le consomment via `/api/v1`.

### 2.1 Modules (bounded contexts)

Un dossier par domaine sous `src/apps/api/Modules/` :

| Module | Responsabilité |
|---|---|
| **Identity** | users, accounts, refresh tokens, auth JWT, profil, rôles |
| **Adoption** | pets, photos, favorites, applications, **contrats** (adoption + familles d'accueil / foster), back-office refuge |
| **Shelters** | refuges, follows, équipes (membres + permissions) |
| **LostFound** | reports perdu/trouvé, matching PostGIS, report_matches |
| **Pensions** | pensions pro, bookings, reviews |
| **Veterinarians** | annuaire vétérinaires |
| **Notifications** | notifications persistées + device tokens |
| **Gamification** | crédits de résolution |
| **Moderation** | content reports (réservé `platform_admin`) |
| **Messaging** | conversations / messages (polling) |

Chaque module suit la même structure interne :

- `Domain/` : entités EF + enums métier.
- `Application/` : services (logique métier, namespace `.Services`).
- `Infrastructure/` : configurations EF (mapping sur le schéma `dorloter_api` existant).
- `Web/` : contrôleurs fins + DTOs.
- `<Module>Module.cs` : enregistrement DI via `Add<Module>Module()`.

**Frontières inter-modules.** Un module n'accède à un autre QUE via son API publique exposée au niveau du package racine du module (ex. `ShelterDirectory`, `ShelterMembership`, `UserDirectory`), jamais via ses entités internes. C'est ce qui rend le monolithe « modulaire » : les couplages sont explicites et contenus à des contrats nommés.

### 2.2 Infrastructure transverse

Sous `src/apps/api/Infrastructure/` :

- **Persistence** : `DorloterDbContext` (Kysely 10 mappé sur le schéma `dorloter_api`, sans migrations EF) et `DatabaseMigrator` qui applique au démarrage des fichiers `.sql` embarqués (`Migrations/`, compatible avec un schéma déjà géré par Flyway).
- **Security** : `JwtService`, encodeur **scrypt** compatible Better Auth (import des comptes existants sans reset), `CurrentUser`.
- **Email** : `IEmailSender` + `SmtpEmailSender` (SMTP). Provider-agnostique (Brevo, OVH, Scaleway TEM, Postfix). L'email transactionnel **est porté** sur l'API.
- **Web** : gestionnaire global d'exceptions (formatage de l'enveloppe d'erreur).

Le dossier `Shared/` regroupe les primitives : `ApiResponse` / `PageResponse`, `DomainException` / `ErrorCode`, `CursorCodec`, `DbEnum` (+ converters JSON/EF), `GeoPoints`, `ITimestamped`.

### 2.3 Contrat d'API stable

Partagé par les trois clients :

- Succès objet : `{ data }`.
- Liste paginée (cursor keyset, `createdAt DESC, id DESC`) : `{ data, pagination }`.
- Erreur : `{ error: { code, message, details? } }`, codes stables (`ErrorCode`).
- Routes sous `/api/v1`. OpenAPI servi sur `/api/v1/openapi`.

### 2.4 PostGIS

PostGIS via Npgsql. Points construits via `GeoPoints.Of(lng, lat)` (SRID 4326). Le matching perdu/trouvé et les requêtes de proximité sont en **SQL natif** (`ST_DWithin` / `ST_Distance` sur `::geography`, mètres géodésiques). PostGIS est le différenciateur technique du projet : pas d'alternative NoSQL ni de calcul géo côté client.

### 2.5 Tests

xUnit + Testcontainers (PostGIS), donc une vraie base spatiale par run.

---

## 3. Les fronts

### 3.1 Séparation public / pro

Deux SPA distinctes, déployées sur deux domaines, mais **sans duplication de code** :

- **`apps/web` · SPA publique** (`dorloter.fr`, port 5173 en dev) : la vitrine adoptants. Catalogue d'adoption, fiches animaux, signalements perdu/trouvé et carte, annuaires pensions/vétérinaires, favoris, candidatures, messagerie. Les pages publiques (catalogue, signalements) sont accessibles sans compte ; l'auth n'est requise que pour signaler, candidater, gérer ses favoris, messagerie. Inclut MapLibre GL (via react-map-gl) pour la cartographie.

- **`apps/pro` · SPA espace pro** (`pro.dorloter.fr`, port 5174 en dev) : le back-office. Consoles **refuge**, **pension** et **vétérinaire**, plus l'**admin plateforme**. Architecture :
  - `DashShell` : le shell de console commun (layout dashboard).
  - `ConsoleHome` : aiguillage selon le rôle / l'appartenance de l'utilisateur vers la bonne console.
  - `RequirePro` : garde de route (accès réservé à un rôle pro OU à l'appartenance à un refuge).
  - Layouts par domaine : `ShelterConsoleLayout`, `PensionConsoleLayout`, `AdminConsoleLayout`.

Cette séparation isole l'UX adoptant (chaleureuse, mobile-first, SEO) de l'outil de gestion (dense, fonctionnel) sans payer le coût d'un second codebase : tout le commun vit dans les deux packages partagés ci-dessous.

### 3.2 Mobile · `apps/mobile`

Expo / React Native. Consomme l'API via `packages/api-client` (client `openapi-fetch` typé, généré depuis l'OpenAPI).

---

## 4. Les packages partagés

La clé de la « zéro duplication » entre web et pro : deux packages workspace consommés par les deux fronts.

### 4.1 `packages/ui` · design system

Primitives partagées (boutons, champs, pills, segmented, select, page-head/body, logo, marquee, stamp…), composant `Icon`, helper `cn`, et `theme.css` (tokens Tailwind v4 CSS-first via `@theme`).

> **Tailwind v4 + monorepo** : comme le package vit hors du `node_modules` de chaque app, son contenu doit être explicitement scanné via une directive `@source` dans le CSS de chaque front, sinon les classes utilisées dans `@dorloter/ui` ne sont pas générées.

### 4.2 `packages/client` · couche d'accès API

Tout l'accès à l'API, partagé par web et pro :

- **Transport** : client HTTP avec auth **JWT + refresh automatique** (`api/client.ts`, `api/tokenStore.ts`), helper de query string (`api/qs.ts`).
- **Modules domaine** : un fichier par domaine (`pets`, `pensions`, `reports`, `shelters`, `shelter`, `vets`, `applications`, `favorites`, `foster`, `messaging`, `moderation`, `notifications`, `contracts`, `auth`).
- **Types** : le contrat d'API (`api/types.ts`).
- **Data layer** : `AuthContext` (React) et `queryClient` (TanStack Query) préconfigurés.

Point d'entrée unique `@dorloter/client`. Les deux fronts importent leurs appels API, leur contexte d'auth et leur query client depuis ce seul package.

### 4.3 `packages/api-client` · client typé mobile

Client `openapi-fetch` typé (`types.gen.ts`) généré depuis l'OpenAPI via `bun api:types`. Consommé par le mobile. (Voir le chantier de dérive des types : `types.gen.ts` peut être en retard sur le contrat réel ; régénérer seul peut casser le build.)

---

## 5. Système de contrats (module Adoption)

Le module Adoption porte un **système de contrats** unifié : table `contracts` avec un champ `type ∈ { adoption, foster }`.

- **adoption** : le contrat d'adoption entre l'adoptant et le refuge.
- **foster** : la convention de **famille d'accueil** (foster), liée aux entités `FosterFamily` / `FosterPlacement`.

Une seule table couvre les deux cas (migration `V18__contracts.sql`), branchée sur l'existant (pets, users, shelters). Les services `ContractService` et `FosterService` portent la logique ; les contrôleurs `ContractController`, `FosterController`, `MeFosterController` exposent les routes. Côté fronts, le module est exposé via `@dorloter/client` (`api/contracts.ts`, `api/foster.ts`).

Détail métier : voir **[CONTRATS.md](./CONTRATS.md)**.

---

## 6. Données

- **PostgreSQL 16 + PostGIS**, schéma `dorloter_api`.
- Schéma géré par les migrations `.sql` embarquées de l'API (`DatabaseMigrator` au démarrage), compatible avec un schéma déjà suivi par Flyway. **Pas de migrations EF.**
- Auth : JWT (access 15 min + refresh 30 j opaque en base, table `auth_refresh_tokens`, rotation). Le hash `accounts.password` est au format scrypt de Better Auth, lu et écrit à l'identique par l'API.
- Tables `sessions` / `verifications` : héritage de l'ancien front Better Auth (Next.js retiré), non utilisées par l'API.

Modèle de données détaillé : **[../CLAUDE.md](../CLAUDE.md)**.

---

## 7. Déploiement

Un seul **`docker-compose.prod.yml`** orchestre toute la prod :

| Service | Rôle |
|---|---|
| `postgres` | PostgreSQL 16 + PostGIS (`postgis/postgis:16-3.4`) |
| `minio` (+ `minio-init`) | stockage S3-compatible des images |
| `api` | API (build local) |
| `web` | SPA publique servie en statique (build local) |
| `pro` | SPA pro servie en statique (build local) |
| `caddy` | reverse proxy edge + TLS |

**Caddy edge** est le point d'entrée HTTPS :

- `${DOMAIN}` (public) : sert la SPA `web` en statique, proxifie `/api/v1/*` vers `api:8080`.
- `pro.${DOMAIN}` : sert la SPA `pro` en statique, proxifie `/api/v1/*` vers la **même** API (same-origin pour le front pro).
- `cdn.${DOMAIN}` : proxifie MinIO pour les images.

TLS automatique : Let's Encrypt (ACME HTTP-01) en prod, CA interne de Caddy pour les domaines `.localhost` en local. Souveraineté numérique : hébergement UE (Hetzner, Scaleway, OVH), pas d'AWS / Google / Microsoft en infra.

Guide complet : **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 8. Gaps connus (pas encore portés sur NestJS)

Services portés par l'ancien front Next.js (retiré) et **pas encore réimplémentés** dans l'API. Caddy répond actuellement `501 Not Implemented` sur leurs routes :

- **Uploads d'images** (`/api/v1/uploads/*`) : presign S3 vers MinIO / Scaleway Object Storage.
- **Gifs** (`/api/v1/gifs/*`).
- **Web Push** (VAPID) : abonnements et envoi des notifications navigateur.

En revanche, **l'email transactionnel est porté** (`Infrastructure/Email`, SMTP via SMTP, provider Brevo/OVH/Scaleway/Postfix) et **l'auth est en JWT** côté API.

---

## 9. Principe directeur

Le bon niveau d'ambition pour un projet solo qui veut grossir, c'est le **monolithe modulaire** : des frontières claires (modules à API publique, deux packages partagés pour les fronts), une seule frontière de sécurité (l'API), pas de microservices. L'objectif n'est pas une architecture parfaite, c'est une architecture qui n'empêche jamais d'ajouter un domaine (TNR, billing, communauté…) sans se battre avec le reste du code.
