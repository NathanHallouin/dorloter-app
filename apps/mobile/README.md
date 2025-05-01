# Dorloter · application mobile (Expo)

Application **Expo / React Native** du monorepo. Elle consomme l'API
(`apps/api`) via le client typé `@dorloter/api-client` et partage le même
contrat `/api/v1` que le front web.

## Stack

- **Expo SDK 53** · React Native 0.79, React 19
- **Expo Router** · routing par fichiers (`app/`), typed routes
- **TanStack Query** · cache et état serveur
- **@dorloter/api-client** · client REST typé (workspace)
- **MapLibre** (`@maplibre/maplibre-react-native`) · cartographie signalements
- **expo-notifications** · push · **expo-location** · géoloc · **expo-secure-store** · stockage du token
- **Sentry** (`@sentry/react-native`) · observabilité (no-op sans DSN)

## Structure

```
app/                     # routes Expo Router (file-based)
│   ├── (tabs)/          # accueil, signalements, pensions, messages, compte
│   ├── adopter/         # swipe + quiz adoption
│   ├── pet/ shelter/ pension/ report/   # fiches détaillées
│   ├── compte/          # favoris, candidatures, notifications, profil
│   ├── signaler.tsx login.tsx _layout.tsx
src/
│   ├── components/      # composants partagés
│   └── lib/             # api, auth, location, notifications, uploads, deep-link, observability
app.config.ts            # config Expo (bundle id, plugins, extra.apiBaseUrl)
eas.json                 # profils de build EAS
```

## Prérequis

- **Bun** (gestion des dépendances · installer depuis la racine : `bun install`)
- **Expo CLI** (via `bunx`) et un simulateur iOS / émulateur Android, ou l'app **Expo Go** / un dev client

## Commandes

```bash
cd apps/mobile
bun start            # démarre Metro (expo start)
bun run android      # build + run Android (expo run:android)
bun run ios          # build + run iOS (expo run:ios)
bun run typecheck    # tsc --noEmit
bun run test         # tests unitaires (bun test src/)
bun run test:e2e     # E2E Maestro (.maestro/)

# scripts racine équivalents
bun mobile:dev       # lance le dev
bun mobile:build     # build
bun mobile:emu       # lance l'émulateur
```

## Variables d'environnement

Surchargées au build (profil EAS) ou en dev local. Valeurs par défaut dans `app.config.ts` :

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1          # API consommée
EXPO_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty  # tuiles carto (optionnel)
EXPO_PUBLIC_SENTRY_DSN=                                        # observabilité (optionnel, no-op si vide)
```

## Liens

- Racine du monorepo : [`../../README.md`](../../README.md)
- Client API typé : [`../../packages/api-client/README.md`](../../packages/api-client/README.md)
- Documentation : [`../../docs/`](../../docs/)
