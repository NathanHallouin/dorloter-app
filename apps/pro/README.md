# apps/pro · Espace pro Dorloter

SPA React 19 + Vite + React Router + TanStack Query. C'est le **back-office des professionnels** : consoles refuge / association, pension, et administration plateforme. Distinct de la vitrine publique (`apps/web`), avec son propre shell console (sidebar dense, orientée gestion).

En prod : servi en statique derrière Caddy sur **`pro.dorloter.fr`** (`/api/v1` proxifié vers l'API).

## Stack

- React 19, Vite, React Router, TanStack Query, Tailwind v4
- Design system partagé `@dorloter/ui` · couche API partagée `@dorloter/client`
- Consomme l'API NestJS via `/api/v1`

## Structure

```
src/
├── App.tsx                 # routes : /login, aiguillage (/), /refuge, /pension, /admin
├── main.tsx                # providers (QueryClient, Router, AuthProvider)
├── components/
│   ├── ProtectedRoute.tsx  # garde d'authentification
│   └── dash/               # shell console (DashShell) + kit UI (Stat, Panel, Table…)
└── pages/
    ├── ConsoleHome.tsx     # aiguillage par rôle
    ├── LoginPage.tsx
    ├── shelter/            # console refuge (dashboard, annonces, candidatures…)
    ├── pension/            # console pension (réservations)
    └── admin/              # console admin plateforme (modération)
```

L'accès est ouvert par rôle (`platform_admin` → /admin, `pension_admin` → /pension, sinon → /refuge ; membres d'équipe refuge inclus).

## Commandes

```bash
bun install
bun dev            # http://localhost:5174 (proxy /api -> :8080)
bun run build      # tsc --noEmit && vite build
bun run typecheck
```

Nécessite l'API lancée (voir `../api`) et la base de données (voir la racine).

## Variables d'env

- `VITE_API_URL` · base de l'API (vide = same-origin `/api/v1` derrière Caddy en prod)
- `VITE_API_PROXY` · cible du proxy Vite en dev (défaut `http://localhost:8080`)

Voir [README racine](../../README.md) et [docs/](../../docs/).
