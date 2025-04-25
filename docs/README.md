# Documentation Dorloter

Dorloter est une plateforme française d'**adoption** et de **retrouvailles** d'animaux domestiques (chats et chiens, extensible aux NAC), complétée d'un **annuaire de pensions professionnelles** agréées. Le produit s'appuie sur une **API** (`apps/api`, le service API, routes `/api/v1`), un **front web SPA** React + Vite (`apps/web`) et une **app mobile** Expo (`apps/mobile`), avec Postgres/PostGIS et un stockage S3-compatible (MinIO/Scaleway).

> La **source de vérité** du projet (stack, modèle de données, conventions) est le fichier **[../CLAUDE.md](../CLAUDE.md)** à la racine du dépôt. Les documents `docs/` ci-dessous apportent du détail, du contexte et de l'historique. Plusieurs documents de conception ont été rédigés à l'époque de l'ancien front Next.js (retiré) : ils portent un encart de contexte en tête précisant ce qui reste valable et ce qui est caduc.

## Architecture & technique

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Réflexion sur le monolithe modulaire à bounded contexts et les frontières inter-modules (proposition d'origine, réalisée dans l'API). |
| [SERVICES-API.md](./SERVICES-API.md) | Pattern services + contrat d'API REST (versioning, enveloppe `{ data }` / `{ error }`, pagination cursor, DTO). Conventions toujours valables, exemples de code historiques. |
| [MESSAGING.md](./MESSAGING.md) | Design de la messagerie 1-to-1 (flux, modèle de données, réactions). L'implémentation actuelle est en polling côté API. |
| [GAMIFICATION.md](./GAMIFICATION.md) | Stratégie d'engagement : crédits de résolution, badges de contribution, garde-fous anti dark-patterns. |

## Infrastructure & déploiement

| Document | Description |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Guide de mise en production de bout en bout : provisioning VPS, Caddy, Docker Compose, backups, CI/CD, incidents. |
| [HEBERGEMENT-ET-API.md](./HEBERGEMENT-ET-API.md) | Stratégie d'hébergement souverain (EU) et API partagée web/mobile, coûts indicatifs et plan de montée en charge. |
| [ENV.md](./ENV.md) | Inventaire des variables d'environnement (dev et prod) et procédure de génération des secrets. |

## Produit & roadmap

| Document | Description |
|---|---|
| [VISION.md](./VISION.md) | Vision produit, positionnement et ambition long terme de Dorloter. |
| [ROADMAP.md](./ROADMAP.md) | Roadmap MVP et journal d'avancement du socle fonctionnel. |
| [ROADMAP-V2.md](./ROADMAP-V2.md) | Pistes d'évolution post-MVP (outils refuges avancés, V2), avec trade-offs et valeur perçue. |
| [AMELIORATIONS-UX.md](./AMELIORATIONS-UX.md) | Recommandations UX transverses : parcours, performance perçue, accessibilité, mobile-first. |

## Design

| Document | Description |
|---|---|
| [design/](./design/) | Export du design system (tokens, primitives, écrans de référence en JSX/HTML). Voir [design/README.md](./design/README.md). |

## Référence

| Document | Description |
|---|---|
| [COMPTES-TEST.md](./COMPTES-TEST.md) | Comptes de démonstration (rôles, permissions, messagerie) pour l'environnement de dev local. |
