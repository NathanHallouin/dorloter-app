# Dorloter · front React (Vite)

Front **React « brut » (sans Next.js)** qui consomme l'**API Java** (`/api/v1`).
SPA Vite + React + TypeScript + React Router + TanStack Query + Tailwind v4.

## Lancer

```bash
# 1. Démarrer l'API Java (autre terminal)
cd ../api && ./mvnw spring-boot:run        # http://localhost:8080

# 2. Démarrer le front
bun install                                # (à la racine du monorepo)
bun --cwd apps/web run dev             # http://localhost:5173
```

En dev, Vite proxifie `/api` vers `http://localhost:8080` (cf. `vite.config.ts`),
donc aucun souci de CORS. En prod, définir `VITE_API_URL` sur l'URL de l'API.

## Commandes

```bash
bun --cwd apps/web run dev        # serveur de dev
bun --cwd apps/web run build      # typecheck + build prod (dist/)
bun --cwd apps/web run preview    # prévisualiser le build
bun --cwd apps/web run typecheck  # tsc --noEmit
```

## Architecture

```
src/
├── api/          # client HTTP (JWT + refresh auto sur 401) + modules par domaine + types
├── auth/         # AuthContext (login/register/logout, /me)
├── components/   # Layout, ProtectedRoute, PetCard
├── pages/        # Accueil, Catalogue, Détail, Perdus-trouvés, Pensions,
│                 # Favoris, Candidatures, Login, Register, 404
├── lib/          # QueryClient
└── main.tsx      # providers (Query + Router + Auth)
```

- **Auth JWT** : `access` + `refresh` en localStorage ; le client retente une fois
  après refresh sur 401 (`src/api/client.ts`).
- **Pas de Supabase** : toutes les données viennent de l'API Java. Le format de
  réponse (`{ data }` / `{ data, pagination }` / `{ error }`) est géré côté client.

## Écrans

Publics : accueil, catalogue d'adoption (filtres + pagination cursor), fiche animal,
perdus-trouvés (**carte MapLibre** + liste), **fiche signalement avec ses
correspondances** (score + distance, met en valeur le matching géo de l'API),
annuaire pensions. Authentifiés : favoris, candidatures, dépôt de candidature et
mise en favori depuis la fiche animal, **signalement d'un animal** (formulaire avec
sélection du lieu sur la carte).

Cartographie : `react-map-gl` + `maplibre-gl`, tuiles OpenFreeMap (gratuit, sans clé,
surchargeable via `VITE_MAP_STYLE`). Le bundle maplibre est volumineux : à lazy-loader
(`React.lazy` sur les pages carte) si besoin.

À étendre (back-office, messagerie, notifications in-app...) : le client API et le
routing sont prêts pour brancher de nouveaux écrans.
