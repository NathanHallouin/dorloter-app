# CLAUDE.md · packages/client

> Couche d'accès API partagée (`@dorloter/client`), consommée par `apps/web` et
> `apps/pro`. Ce fichier complète le [CLAUDE.md racine](../../CLAUDE.md).
>
> À ne pas confondre avec `packages/api-client`, qui est le client **généré**
> destiné au mobile.

## Contenu

- `api/client.ts` : client HTTP (bearer JWT, refresh transparent, parsing de l'enveloppe d'erreur en `ApiClientError`).
- `api/*.ts` : un module par domaine (`pets`, `reports`, `shelter`, `applications`, `uploads`…). Chaque fonction renvoie déjà `r.data`, donc le contenu utile de l'enveloppe.
- `api/types.ts` : types partagés du contrat.
- `auth/AuthContext.tsx` : contexte React d'authentification.
- `queryClient.ts` : instance TanStack Query commune.

Tout passe par le barrel `src/index.ts`.

## Conventions

- Un fichier par domaine métier, nommé comme le domaine de l'API.
- Les fonctions renvoient la donnée, jamais l'enveloppe : `.then((r) => r.data)`.
- Types de sortie en camelCase, alignés sur les DTO de l'API.
- Ce package ne contient **aucun JSX de présentation** et ne dépend pas de `@dorloter/ui`.
- Ajouter un endpoint : d'abord le module de domaine ici, ensuite l'écran. Ne jamais appeler `fetch` depuis un composant.

## Jetons

L'access token et le refresh token sont conservés dans `localStorage` (`tokenStore.ts`). Le caveat XSS est connu et assumé pour le MVP · c'est aussi ce qui permet de dire, dans la politique de confidentialité, qu'aucun cookie non essentiel n'est déposé et qu'aucun bandeau de consentement n'est nécessaire. Changer ce choix impacterait ce raisonnement.

Le renouvellement est géré dans `client.ts` : sur 401, la requête est rejouée une fois après refresh.

## Upload

`uploadsApi.uploadFile(file, kind)` enchaîne présignature et `PUT` direct vers le stockage objet, puis renvoie l'URL publique à enregistrer. Le binaire ne passe jamais par l'API. Le `Content-Type` doit être exactement celui présigné ; `Content-Length` est posé par le navigateur, donc cohérent d'office avec la taille annoncée.

## Commandes

```bash
bun run typecheck  # tsc --noEmit
```
