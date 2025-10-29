# Dorloter · front web (React + Vite)

SPA grand public du monorepo : catalogue d'adoption, perdus / trouvés, annuaire
des pensions, fiches refuge. **React 19 + Vite + TypeScript**, consomme l'API
(`apps/api`, NestJS) via `/api/v1`. Build statique (`dist/`) servi par Caddy en
prod sur `dorloter.fr`.

Le back-office des professionnels est une SPA distincte : [`apps/pro`](../pro/README.md).

## Stack

- **React 19 + Vite** · SPA TypeScript
- **React Router** · routing client
- **TanStack Query** · cache et état serveur
- **Tailwind CSS v4** · plugin `@tailwindcss/vite`, config CSS-first via `@theme`
- **MapLibre** (`react-map-gl` + `maplibre-gl`) · carte des signalements, tuiles OpenFreeMap
- **`@dorloter/ui`** · design system partagé avec `apps/pro`
- **`@dorloter/client`** · couche d'accès API partagée (client HTTP JWT + refresh
  auto sur 401, types, `AuthContext`, `queryClient`)

## Structure

```
src/
├── App.tsx           # routes (pages cartographiques en import différé)
├── main.tsx          # providers (Query + Router + Auth)
├── components/       # Layout, ProtectedRoute, PetCard, cartes MapLibre,
│   └── layout/       #   navigation, footer, palette de commandes
├── pages/            # accueil, catalogue, swipe, quiz, comparateur, fiche animal,
│                     #   perdus-trouvés (+ affiche), pensions, refuges, événements,
│                     #   favoris, candidatures, réservations, famille d'accueil,
│                     #   messages, notifications, profil, auth
├── lib/              # utilitaires locaux
└── index.css         # thème Tailwind (@source vers packages/ui)
```

Le client HTTP, les types et l'authentification ne vivent pas ici : ils sont dans
[`packages/client`](../../packages/client), partagés avec `apps/pro`.

## Prérequis

- **Bun** (dépendances installées depuis la racine : `bun install`)
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

**Publics** : accueil, catalogue d'adoption (filtres + pagination cursor), swipe,
quiz de compatibilité, comparateur, fiche animal, perdus-trouvés (carte MapLibre +
liste) et fiche signalement avec ses correspondances (score + distance, qui met en
valeur le matching géo de l'API), annuaire des pensions et fiche pension, annuaire
des refuges et fiche refuge (événements publics, besoins), calendrier des
événements, à propos, presse.

**Authentifiés** : favoris, candidatures, réservations de pension, relation famille
d'accueil, messagerie avec les refuges, centre de notifications, profil (dont la
localisation pour le digest « Nouveautés dans votre rayon »), dépôt de candidature
et mise en favori depuis la fiche animal, signalement d'un animal perdu ou trouvé
(sélection du lieu sur la carte).

## Liens

- Racine du monorepo : [`../../README.md`](../../README.md)
- API : [`../api/README.md`](../api/README.md)
- Documentation : [`../../docs/`](../../docs/)
