# Documentation Dorloter

Dorloter est une plateforme française d'**adoption** et de **retrouvailles** d'animaux domestiques (chats et chiens, extensible aux NAC), complétée d'un **annuaire de pensions professionnelles** agréées. Le produit s'appuie sur une **API NestJS** (`apps/api`, Kysely + PostGIS, routes `/api/v1`), une **SPA publique** React + Vite (`apps/web`, `dorloter.fr`), une **SPA espace pro** (`apps/pro`, `pro.dorloter.fr`) et une **app mobile** Expo (`apps/mobile`). Les deux fronts web partagent leur design system (`packages/ui`) et leur couche d'accès API (`packages/client`). Postgres/PostGIS pour les données, MinIO/Scaleway pour le stockage S3-compatible, Caddy en reverse proxy.

> La **source de vérité** du projet est le fichier **[../CLAUDE.md](../CLAUDE.md)** à la racine, complété par un `CLAUDE.md` par workspace : [apps/api](../apps/api/CLAUDE.md) (qui porte le **modèle de données** complet), [apps/web](../apps/web/CLAUDE.md), [apps/pro](../apps/pro/CLAUDE.md), [apps/mobile](../apps/mobile/CLAUDE.md), [packages/ui](../packages/ui/CLAUDE.md), [packages/client](../packages/client/CLAUDE.md), [packages/api-client](../packages/api-client/CLAUDE.md). Les documents `docs/` ci-dessous apportent du détail, du contexte et de l'historique. Plusieurs documents de conception ont été rédigés à l'époque de l'ancien front Next.js (retiré) : ils portent un encart de contexte en tête précisant ce qui reste valable et ce qui est caduc.

> **Périmètre produit** · deux fonctionnalités ont été **retirées** le 2026-03-07, . Les documents de vision et de roadmap qui les évoquent encore le font au titre de pistes stratégiques, pas de l'état du code.

## Architecture & technique

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture de référence : monorepo bun workspaces (apps/api NestJS, apps/web, apps/pro, apps/mobile), packages partagés (ui, client, api-client), modules de l'API, séparation public/pro, déploiement, gaps. |
| [SERVICES-API.md](./SERVICES-API.md) | Pattern services + contrat d'API REST (versioning, enveloppe `{ data }` / `{ error }`, pagination cursor, DTO). |
| [MESSAGING.md](./MESSAGING.md) | Design de la messagerie 1-to-1 (flux, modèle de données, réactions). Implémentation en polling côté API. |
| [GAMIFICATION.md](./GAMIFICATION.md) | Stratégie d'engagement : crédits de résolution, badges de contribution, garde-fous anti dark-patterns. |
| [CONTRATS.md](./CONTRATS.md) | Système de contrats du module Adoption : table `contracts` (type adoption / foster), contrats d'adoption et conventions de famille d'accueil. |
| [EMAIL.md](./EMAIL.md) | Email transactionnel : émetteur `infra/email` (gabarits + déclencheurs en place · transport SMTP réel à brancher, provider Brevo/OVH/Scaleway/Postfix). |
| [RGPD.md](./RGPD.md) | Conformité RGPD : polices auto-hébergées, documents légaux, droits des personnes (export, effacement), purge de rétention, procédure de violation, et ce qui reste à la charge de l'éditeur. |
| [RGPD-REGISTRE.md](./RGPD-REGISTRE.md) | Registre des activités de traitement (art. 30) : onze traitements documentés (finalité, base légale, données, destinataires, durée), sous-traitants et mesures de sécurité. |

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
