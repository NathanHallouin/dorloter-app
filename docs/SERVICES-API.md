# Services & API REST — pattern et conventions

Document de référence pour les contributeurs : comment factoriser la
logique métier en **services** réutilisables par les **Server Actions**
(web) et les **routes `/api/v1/*`** (mobile).

> **Statut** : adoption en cours. La couche infra (`@infra/api/*`) est
> prête, le domaine `adoption.pets.getPetWithDetails` sert de pilote.
> Migration des autres domaines à faire incrémentalement — voir §7.

---

## 1. Pourquoi des services

Aujourd'hui, la logique métier est répartie entre :

- `domains/X/queries/` — accès lecture (SQL, pas de logique métier)
- `domains/X/actions/` — Server Actions Next.js (validation FormData,
  `revalidatePath`, retour `ActionResponse`)

Quand on ajoutera l'API mobile (`/api/v1/*`), elle aura besoin de la
**même** logique métier. Si on la duplique, on a deux endroits à mettre
à jour à chaque règle métier — typiquement un endroit qui dérive et le
client mobile commence à différer du web.

**Solution** : extraire la logique métier dans un troisième niveau —
`domains/X/services/` — qui est :

- **pur** : pas de `revalidatePath`, pas de FormData, pas de `NextResponse`
- **typé** : entrées et sorties typées, pas de `unknown`
- **orchestrateur** : appelle les `queries/` et compose
- **contractuel** : `throw DomainError` sur les cas métier (introuvable,
  non autorisé, conflit) avec un code stable

Les Server Actions et les routes API deviennent des **fines coquilles**
qui appellent les services et formatent la réponse.

```
┌──────────────────────────┐  ┌────────────────────────┐
│ Server Action (web)      │  │ Route /api/v1/* (mobile)│
│ - parse FormData         │  │ - parse query/body Zod │
│ - call service           │  │ - call service         │
│ - revalidatePath         │  │ - format JSON          │
│ - return ActionResponse  │  │ - format JSON error    │
└──────────┬───────────────┘  └──────────┬─────────────┘
           │                             │
           └──────────────┬──────────────┘
                          ▼
                ┌─────────────────────┐
                │ Service de domaine  │
                │ - logique métier    │
                │ - throw DomainError │
                │ - retourne entité   │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Queries / DB        │
                └─────────────────────┘
```

---

## 2. Anatomie d'un service

```ts
// src/domains/adoption/services/pets.service.ts

import { notFound } from "@infra/api/errors";
import * as petQueries from "../queries/pets";

const UUID_RE = /^[0-9a-f]{8}-.{27}$/i;

export async function getPetWithDetails(id: string): Promise<PetWithDetails> {
  if (!UUID_RE.test(id)) {
    throw notFound("Animal", id);
  }
  const pet = await petQueries.getPetWithDetails(id);
  if (!pet) {
    throw notFound("Animal", id);
  }
  return pet;
}
```

Trois règles d'or :

1. **Une seule source de vérité métier.** Si la règle « un user ne peut
   candidater qu'une fois sur le même chat » change, elle change ici, pas
   dans Server Action ET dans route API.
2. **Throw, ne pas return un Result.** Le code reste linéaire. Le wrapper
   API et la Server Action catch et formatent.
3. **Pas de Next.js dans un service.** Si tu importes `next/cache`,
   `next/headers`, `revalidatePath` — c'est le signal que tu es dans une
   coquille (Server Action), pas dans un service.

---

## 3. Erreurs de domaine — `DomainError`

Toute erreur "métier" est une `DomainError` avec un code stable parmi
`@infra/api/errors`. Les codes sont **publics** : ils sont exposés au
client mobile et ne doivent **jamais** être renommés (versionner sinon).

Constructeurs courants :

```ts
import {
  notFound,
  unauthorized,
  forbidden,
  validationFailed,
  conflict,
  rateLimited,
} from "@infra/api/errors";

throw notFound("Pet", id);                       // 404
throw unauthorized();                            // 401
throw forbidden("Pas admin de ce refuge.");      // 403
throw validationFailed("Description trop courte");// 400
throw conflict("Vous avez déjà candidaté.");     // 409
throw rateLimited(retryAfterSec);                // 429
```

Tout autre `Error` qui remonte au handler API est converti en
`INTERNAL_ERROR` (500) — message générique, log structuré côté serveur.

---

## 4. Server Actions — coquille fine

```ts
// src/domains/adoption/actions/pets.ts

"use server";

import { revalidatePath } from "next/cache";
import { DomainError } from "@infra/api/errors";
import * as petsService from "../services/pets.service";
import type { ActionResponse } from "@/types";

export async function getPet(id: string): Promise<ActionResponse<PetWithDetails>> {
  try {
    const pet = await petsService.getPetWithDetails(id);
    return { success: true, data: pet };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    throw err; // remonte aux logs Next.js
  }
}
```

Pour les mutations, on ajoute le `revalidatePath` après le service :

```ts
const result = await petsService.createPet(input);
revalidatePath("/adopter");
return { success: true, data: result };
```

---

## 5. Routes API REST — coquille fine

```ts
// src/app/api/v1/pets/[id]/route.ts

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { getPetWithDetailsService } from "@adoption/public";
import { toPetDto } from "@/app/api/v1/_dtos/pet";

const paramsSchema = z.object({ id: z.string().uuid() });

export const GET = withApi(
  { paramsSchema },
  async ({ params, requestId }) => {
    const pet = await getPetWithDetailsService(params.id);
    return apiOk(toPetDto(pet), { requestId });
  }
);
```

`withApi(options, handler)` gère pour toi :

- Génération / propagation de `X-Request-Id`
- Authentification Better Auth (cookie ou bearer)
- Validation Zod des `params`, `query`, `body`
- Rate-limiting optionnel par clé logique
- Capture des `DomainError` → JSON HTTP propre
- Capture des exceptions inconnues → 500 sans fuite

Options du wrapper :

```ts
{
  paramsSchema?: ZodSchema,    // /pets/[id] → { id: string }
  querySchema?: ZodSchema,     // ?cursor=…&limit=…
  bodySchema?: ZodSchema,      // POST/PATCH body JSON
  authRequired?: boolean,      // 401 si pas connecté
  rateLimit?: {
    key: string,
    limit: number,
    windowSec: number,
  },
}
```

---

## 6. DTOs — la stabilité du contrat

Ne jamais retourner directement une entité Drizzle dans une réponse API.
Toujours passer par un **DTO** (`src/app/api/v1/_dtos/`) :

- découple le contrat API du schéma DB (renommer une colonne ne casse
  plus l'app mobile)
- normalise les types : `Date` → ISO 8601, `decimal` → number
- empêche d'exposer un champ sensible par mégarde (allowlist explicite)

```ts
// src/app/api/v1/_dtos/pet.ts

export interface PetDto { /* allowlist explicite */ }

export function toPetDto(pet: PetWithDetails): PetDto {
  return {
    id: pet.id,
    name: pet.name,
    adoptionFee: pet.adoptionFee !== null ? Number(pet.adoptionFee) : null,
    createdAt: pet.createdAt.toISOString(),
    // ...
  };
}
```

Le DTO est aussi la source de vérité pour le shape OpenAPI. Quand tu
modifies un DTO, tu modifies aussi `buildOpenApiDocument` dans
`@infra/api/openapi.ts`.

---

## 7. Plan de migration

Migration incrémentale, domaine par domaine. Ordre suggéré :

| # | Domaine        | Routes API v1                                 | Effort |
| - | -------------- | --------------------------------------------- | ------ |
| 1 | adoption       | GET /pets, GET /pets/:id, GET /pets/:id/similar | 2 j   |
| 2 | shelters       | GET /shelters, GET /shelters/:slug             | 1 j    |
| 3 | lost-found     | GET /reports?bbox=…, GET /reports/:id          | 2 j    |
| 4 | pensions       | GET /pensions, GET /pensions/:slug             | 1 j    |
| 5 | identity       | (auth déjà via Better Auth, rien à faire)      | 0 j    |
| 6 | favorites      | POST /favorites/:petId, DELETE /favorites/:petId | 1 j   |
| 7 | applications   | POST /applications (création)                  | 2 j    |
| 8 | reports (créat.)| POST /reports                                 | 2 j    |
| 9 | notifications  | POST /devices (register APNs/FCM token)        | 1 j    |

Chaque domaine se migre en 4 étapes :

1. **Créer `domains/X/services/Y.service.ts`** : extraire la logique des
   queries/actions actuelles. Garder les exports existants pour ne rien
   casser.
2. **Refactor les Server Actions** : appellent maintenant le service.
   Catch `DomainError`, return `ActionResponse`.
3. **Créer la route `/api/v1/X`** avec `withApi` et un DTO.
4. **Mettre à jour `buildOpenApiDocument`** avec le shape de la nouvelle
   route.

Pendant la migration, les anciens exports (`getPetById`, etc.) restent
disponibles. Ne pas les casser tant que tous les call-sites ne sont pas
migrés.

---

## 8. Conventions API à figer

| Sujet         | Convention                                                               |
| ------------- | ------------------------------------------------------------------------ |
| Versioning    | `/api/v1/*` toujours. Breaking change → `/api/v2/*` parallèle 6 mois.    |
| Format succès | `{ data: <payload> }`                                                    |
| Format liste  | `{ data: [...], pagination: { cursor, hasMore } }`                       |
| Format erreur | `{ error: { code, message, details? } }`                                 |
| Pagination    | Cursor-based (`?cursor=abc&limit=20`). Pas d'offset.                     |
| Codes erreur  | Stables, ne JAMAIS renommer (cf. `ERROR_CODES` dans `@infra/api/errors`).|
| Idempotency   | Header `Idempotency-Key` accepté sur POST critiques (création).          |
| Tracing       | Header `X-Request-Id` propagé partout, log structuré avec ce champ.      |
| Auth          | `Authorization: Bearer <token>` (mobile) ou cookie (web).                |
| Rate limit    | Par IP + par user. `429` avec `Retry-After`.                             |
| CORS          | Web même origine, mobile pas de CORS. Pas de `Access-Control-Allow-Origin: *`. |
| Locale        | `Accept-Language: fr-FR` (français par défaut).                          |

---

## 9. Génération du client mobile

L'app Expo consomme un client TS auto-généré depuis `openapi.json` :

```bash
# Dans apps/mobile/ (quand le monorepo Turborepo sera en place)
bunx openapi-typescript https://dorloter.fr/api/v1/openapi.json -o src/api-types.ts
```

Le client est ensuite utilisé via `openapi-fetch` :

```ts
import createClient from "openapi-fetch";
import type { paths } from "./api-types";

const api = createClient<paths>({ baseUrl: "https://dorloter.fr/api/v1" });

const { data, error } = await api.GET("/pets/{id}", {
  params: { path: { id: petId } },
});
```

Type-safety complète, suggestions d'autocomplétion, validation au build.

---

## 10. Tester

Une route API ressemble à n'importe quelle handler Next.js — on peut la
tester :

- **End-to-end** : Playwright qui hit `/api/v1/pets/...` et asserte le
  shape de la réponse (cf. `tests/e2e/`)
- **Service isolé** : `vitest` sur le service avec un mock de
  `petQueries` (recommandé pour les règles métier complexes)

Voir `tests/e2e/a11y.spec.ts` pour la mise en place Playwright + axe.
