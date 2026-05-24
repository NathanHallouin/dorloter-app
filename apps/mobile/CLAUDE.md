# CLAUDE.md · apps/mobile

> Application Expo / React Native. Ce fichier complète le
> [CLAUDE.md racine](../../CLAUDE.md).

## Stack

Expo + expo-router (routing par fichiers dans `app/`), TanStack Query, MapLibre natif. L'accès API passe par **`packages/api-client`** (client `openapi-fetch` typé, généré depuis l'OpenAPI) et non par `@dorloter/client`, qui est réservé aux fronts web.

## Session et renouvellement

L'API émet un **access token de 15 minutes** et un **refresh token opaque à rotation**. `src/lib/auth.ts` gère tout :

- `saveSession()` persiste les deux jetons et l'échéance dans `expo-secure-store` (Keychain iOS, EncryptedSharedPreferences Android).
- `getAuthToken()` renouvelle de lui-même quand l'échéance approche, avec un verrou partagé pour éviter N renouvellements concurrents. Les écrans n'ont donc rien à gérer.
- Réseau indisponible pendant un renouvellement : la session est conservée et l'appel échouera normalement, plutôt que de déconnecter à tort.
- `logout()` révoque le refresh token côté serveur avant d'effacer le local · sans ça un jeton volé resterait valable un mois.

Les routes d'auth sont `POST /api/v1/auth/login|register|refresh|logout`. **Pas de « mot de passe oublié »** : aucun endpoint de réinitialisation n'existe côté API ni sur le web, l'écran a donc été retiré plutôt que de promettre un email qui ne partirait jamais.

## Upload

`src/lib/uploads.ts` fait presign puis `PUT` direct vers le stockage objet. La taille et le type MIME sont **signés** : déposer un fichier plus gros que déclaré est refusé par le stockage, ce n'est pas qu'une validation de confort.

`uploadVoice()` vise `POST /uploads/voice`, un endpoint multipart **qui n'existe pas encore** côté API (répond 501). Les messages vocaux sont donc non fonctionnels tant qu'il n'est pas porté.

## Conventions

- Props typées avec une interface dédiée, pas de `any`.
- Imports absolus via `@/` mappé sur `src/`.
- Routes dans `app/` (convention expo-router), composants et utilitaires dans `src/`.
- Le fallback d'URL d'API est `http://localhost:8080/api/v1` ; en device réel, passer par `EXPO_PUBLIC_API_BASE_URL`.

## Commandes

```bash
bun start          # Expo

# Depuis la racine du dépôt :
bun mobile:dev     # Metro tunnel + cloudflared vers l'API locale (device réel)
bun mobile:emu     # émulateur Android (WSL2), API atteinte via 10.0.2.2:8080
bun mobile:build   # build EAS dev-client
```

Les deux scripts de session exigent que l'API tourne (`cd apps/api && bun dev`).

Tests end-to-end Maestro dans `.maestro/` : `maestro test .maestro/01-signin-and-favorite.yaml`.

## Variables d'environnement

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```
