# Dorloter · front web (React + Vite)

SPA grand public du monorepo : catalogue d'adoption, perdus / trouvés, annuaire
pensions. **React 19 + Vite + TypeScript**, consomme l'API (`apps/api`)
via `/api/v1`. Build statique (`dist/`) servi par Caddy en prod.

## Stack

- **React 19 + Vite** · SPA TypeScript
- **React Router** · routing client
- **TanStack Query** · cache et état serveur
- **Tailwind CSS v4** · plugin `@tailwindcss/vite`, config CSS-first via `@theme`
- **MapLibre** (`react-map-gl` + `maplibre-gl`) · carte des signalements, tuiles OpenFreeMap
- **Auth JWT** · access + refresh en localStorage, retry auto sur 401 après refresh

## Structure

```
src/
├── api/          # client HTTP (JWT + refresh auto) + modules par domaine + types
├── auth/         # AuthContext (login / register / logout, /me)
├── components/   # Layout, ProtectedRoute, PetCard, ...
├── pages/        # accueil, catalogue, fiche animal, perdus-trouvés, pensions,
│                 #   favoris, candidatures, login, register, 404
├── ui/           # primitives UI
├── lib/          # QueryClient
└── main.tsx      # providers (Query + Router + Auth)
```

## Prérequis

- **Bun** (gestion des dépendances · installer depuis la racine : `bun install`)
- L'**API** lancée sur `:8080` (cf. [`../api/README.md`](../api/README.md))

## Commandes

```bash
cd apps/web
bun dev            # serveur de dev Vite (http://localhost:5173)
bun run build      # typecheck (tsc --noEmit) + build prod (dist/)
bun run preview    # prévisualiser le build
bun run typecheck  # tsc --noEmit
```

En dev, Vite proxifie `/api` vers l'API (cf. `vite.config.ts`), donc pas de souci
de CORS.

## Variables d'environnement

```env
VITE_API_PROXY=http://localhost:8080   # cible du proxy /api en dev
VITE_API_URL=                          # URL de l'API en prod (si pas de proxy)
VITE_MAP_STYLE=                        # style de tuiles MapLibre (défaut OpenFreeMap, sans clé)
```

## Écrans

Publics : accueil, catalogue d'adoption (filtres + pagination cursor), fiche animal,
perdus-trouvés (carte MapLibre + liste), fiche signalement avec ses correspondances
(score + distance, met en valeur le matching géo de l'API), annuaire pensions.
Authentifiés : favoris, candidatures, dépôt de candidature et mise en favori depuis
la fiche animal, signalement d'un animal (sélection du lieu sur la carte).

## Liens

- Racine du monorepo : [`../../README.md`](../../README.md)
- API : [`../api/README.md`](../api/README.md)
- Documentation : [`../../docs/`](../../docs/)
