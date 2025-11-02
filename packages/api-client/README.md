# @dorloter/api-client

Client TypeScript **typé** de l'API REST Dorloter, partagé par les fronts
du monorepo (`apps/web`, `apps/mobile`). Construit sur `openapi-fetch`, ses
types sont **générés depuis l'OpenAPI de l'API** (`apps/api`, NestJS) · source
unique de vérité du contrat.

## Stack

- **openapi-fetch** · wrapper `fetch` typé (méthodes `GET` / `POST` / ... par path)
- **openapi-typescript** · génération des types depuis le document OpenAPI
- Aucune dépendance Next.js / DOM : utilisable côté web, mobile (Expo) et Node / tests

## Structure

```
src/
├── index.ts        # createApiClient() + types réexportés (édité à la main)
└── types.gen.ts    # types OpenAPI · GÉNÉRÉ, ne pas éditer à la main
```

## Usage

```ts
import { createApiClient } from "@dorloter/api-client";

const api = createApiClient({
  baseUrl: "https://dorloter.fr/api/v1",
  getAuthToken: () => SecureStore.getItemAsync("session_token"), // mobile
});

const { data, error } = await api.GET("/pets", {
  params: { query: { species: "chat", limit: 20 } },
});
```

L'enveloppe de réponse (`{ data }` / `{ data, pagination }` / `{ error }`) et les
codes d'erreur stables sont décrits par les types générés (`ApiError`, `ErrorCode`).

## Régénérer les types

`types.gen.ts` est committé mais **généré**. Après tout changement de route
ou de DTO côté API :

```bash
# 1. lancer l'API (autre terminal)
cd apps/api && bun dev                                  # http://localhost:8080

# 2. régénérer depuis la racine du monorepo
bun api:types
```

Source consommée : `http://localhost:8080/api/v1/openapi` (surchargeable via la
variable d'env `OPENAPI_URL`). Le script est `scripts/generate-api-types.ts`.

> **Note** : le document OpenAPI servi par l'API est encore **partiel**
> (annotation exhaustive via `@nestjs/swagger` à venir). Le contrat étant resté
> identique à travers les réécritures successives du backend, le `types.gen.ts`
> committé reste **valide** ; ne pas régénérer tant que l'annotation complète
> n'est pas en place, au risque d'appauvrir le client.

## Commandes

```bash
bun api:types                  # régénère src/types.gen.ts (depuis la racine)
bun --cwd packages/api-client run typecheck   # tsc --noEmit
```

## Liens

- Racine du monorepo : [`../../README.md`](../../README.md)
- API (contrat source) : [`../../apps/api/README.md`](../../apps/api/README.md)
- Documentation : [`../../docs/`](../../docs/)
