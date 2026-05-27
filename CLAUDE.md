# CLAUDE.md · Dorloter

> **Contexte découpé.** Ce fichier porte l'identité du produit, l'architecture
> d'ensemble et les règles transverses. Le détail de chaque partie vit dans un
> `CLAUDE.md` local, chargé quand on travaille dans le dossier concerné :
>
> | Partie | Fichier | Ce qu'il contient |
> |---|---|---|
> | API NestJS | [apps/api/CLAUDE.md](apps/api/CLAUDE.md) | conventions API, **modèle de données complet**, matching, migrations, env |
> | Front public | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) | SPA adoptants, style, cartographie, pages légales |
> | Espace pro | [apps/pro/CLAUDE.md](apps/pro/CLAUDE.md) | consoles refuge/pension/admin, `DashShell`, autorisation |
> | Mobile | [apps/mobile/CLAUDE.md](apps/mobile/CLAUDE.md) | Expo, session et refresh, uploads |
> | Design system | [packages/ui/CLAUDE.md](packages/ui/CLAUDE.md) | primitives, Tailwind v4, thème, polices |
> | Couche API web | [packages/client/CLAUDE.md](packages/client/CLAUDE.md) | modules de domaine, jetons |
> | Client mobile généré | [packages/api-client/CLAUDE.md](packages/api-client/CLAUDE.md) | génération OpenAPI |
>
> Documentation longue : **[docs/](docs/)** · conformité **[docs/RGPD.md](docs/RGPD.md)** · déploiement **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Identité du projet

## Identité du projet

Dorloter est une plateforme web française d'adoption et de retrouvailles d'animaux domestiques. MVP centré sur **chat et chien** ; extensible aux NAC (lapin, rongeur, reptile…) sans refonte. Trois fonctions :

1. **Adoption** · vitrine des refuges et associations, profils d'animaux à adopter (photos, caractère, besoins médicaux, compatibilités). Matching adoptant/animal en swipe ou en liste filtrée, formulaire de candidature en ligne, suivi du processus.

2. **Perdus / Trouvés** · réseau de signalement géolocalisé. Les particuliers signalent un animal perdu ou trouvé, le système rapproche automatiquement les signalements par localisation, espèce, description physique et date. Notifications aux utilisateurs proches.

3. **Pensions** · annuaire des pensions professionnelles agréées (chatteries, chenils). **Pros uniquement** · SIRET et agrément préfecture vérifiés manuellement par l'équipe Dorloter avant publication. Pas de garde entre particuliers, pas de booking intégré en MVP · contact téléphone/email direct.

Domaine : `dorloter.fr`. Projet solo, développeur fullstack freelance basé en France. Priorité MVP : un prototype fonctionnel, pas une architecture parfaite.

## Stack en un coup d'oeil

Monorepo bun workspaces. L'API est un service séparé ; les trois clients la consomment via `/api/v1`.

| Workspace | Rôle | Techno | Port |
|---|---|---|---|
| `apps/api` | **le backend** | NestJS 11 + Kysely + PostGIS | 8080 |
| `apps/web` | vitrine publique · `dorloter.fr` | React 19 + Vite | 5173 |
| `apps/pro` | back-office · `pro.dorloter.fr` | React 19 + Vite | 5174 |
| `apps/mobile` | app native | Expo / React Native | Metro |
| `packages/ui` | design system (web + pro) | Tailwind v4 CSS-first | |
| `packages/client` | couche API (web + pro) | fetch + JWT | |
| `packages/api-client` | client typé (mobile) | openapi-fetch généré | |

**Commun** : PostgreSQL 18 + PostGIS (schéma `dorloter_api`) · MapLibre GL JS · stockage S3-compatible (MinIO en dev, OVH/Scaleway en prod) · Docker Compose en dev, VPS France + Caddy en prod · CI GitHub Actions (rédigée pour rester portable en Forgejo Actions, au cas où le dépôt migrerait sur Codeberg).

> **Historique du backend.** L'API a été portée NestJS, puis Rust, puis NestJS, en préservant le contrat à l'identique à chaque fois : même schéma, mêmes migrations, mêmes hashes scrypt, même enveloppe et mêmes codes d'erreur. Deux features ont été retirées du produit : l'**annuaire vétérinaire** et le **TNR (chats libres)**.

## Architecture

```
apps/
├── api/      # API REST NestJS (Kysely + PostGIS) · port 8080 · LE BACKEND
├── web/      # SPA publique (vitrine adoptants) · port 5173
├── pro/      # SPA espace pro (refuge / pension / admin) · port 5174
└── mobile/   # Expo / React Native

packages/
├── ui/          # design system partagé · web + pro
├── client/      # couche d'accès API partagée · web + pro
└── api-client/  # client openapi-fetch typé · mobile
```

**Deux fronts web, zéro duplication** : `apps/web` et `apps/pro` partagent `@dorloter/ui` et `@dorloter/client`. La séparation est un choix de périmètre et d'UX, pas de sécurité · **l'API reste la seule frontière de sécurité**, identique pour les deux.

**Contrat d'API stable** : enveloppe `{ data }` (objet) / `{ data, pagination }` (liste paginée cursor) / `{ error: { code, message, details? } }`. Codes d'erreur stables, routes sous `/api/v1`. Partagé par les trois clients.

## Conventions transverses

### Générales
- TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- ESLint + Prettier (fronts TypeScript)
- Imports absolus via `@/` mappé sur `src/`
- Nommage fichiers : kebab-case (`pet-card.tsx`, pas `CatCard.tsx`)
- Nommage composants : PascalCase à l'export
- Un composant par fichier

### Typographie (règle absolue)
- **Jamais de cadratin `—` (U+2014) ni de demi-cadratin `–` (U+2013)** dans ce projet, ni dans le code, ni dans le texte visible utilisateur (UI, metadata, OG, emails, manifest, toasts, messages d'erreur exposés), ni dans la documentation interne (CLAUDE.md, README, ROADMAP, JSDoc, commentaires).
- Remplacement par défaut : point médian `·` (U+00B7), qui est déjà la convention du template de titre `%s · Dorloter`.
- Selon le contexte, préférer `:` (définition), `,` (incise courte), `.` (deux phrases) plutôt que `·` si la lisibilité y gagne.
- Exception unique : placeholders typographiques "donnée absente" dans des tableaux/listes. Préférer chaîne vide ou `—` standalone uniquement si aucun autre signe ne convient (et demander à l'utilisateur avant d'introduire un cadratin).

### Git

Commits conventionnels, **en français**, au format `type(scope): sujet`.

- **Types** : `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `merge`.
- **Scopes** usuels : `api`, `web`, `pro`, `mobile`, `ui`, `client` (le workspace touché) ou `refuge`, `adoption`, `lost-found`, `produit`, `infra`, `db` (le domaine métier). Sans scope si le changement est transverse.
- **Sujet** à l'impératif ou au substantif, minuscule, sans point final, sous 72 caractères.
- **Corps** facultatif mais précieux : il dit **pourquoi**, pas quoi. Le diff dit déjà quoi. Les meilleurs commits de ce dépôt expliquent le problème constaté avant le correctif.
- La règle typographique s'applique aussi aux messages de commit.

Un commit = un changement cohérent. Éviter le commit fourre-tout : c'est ce qui a coûté un mois d'historique lors du passage de `dorloter` à `dorloter-app`, écrasé en un seul commit.

**Branches** : `feat/<sujet>`, `fix/<sujet>`, `chore/<sujet>` pour tout chantier de plus de deux ou trois commits, fusionnées en `--no-ff` pour que le regroupement reste lisible dans le graphe. Les changements isolés vont directement sur `main`.

**Réécriture d'historique** : jamais sur ce qui est déjà poussé, sauf décision explicite. `main` est la branche de référence.

## Commandes racine

```bash
docker compose up -d      # PostgreSQL + PostGIS (port 5438) + MinIO
bun db:seed               # seed de test (scripts/seed.sql, idempotent)

bun run typecheck         # = bun run --filter='*' typecheck
bun run build             # = bun run --filter='*' build

bun api:types             # régénère packages/api-client/src/types.gen.ts (API sur :8080)
```

Les commandes propres à chaque workspace sont dans son `CLAUDE.md`.

## Notifications

- **Centre in-app · EN PLACE** : notifications persistées (table `notifications`) + endpoints `notifications` (list/unread-count/read/read-all) et devices Expo. `NotificationsService.publish()` exporté pour usage inter-modules.
- **Email transactionnel · EN PLACE** : `infra/email` envoie via SMTP (nodemailer) dès que `EMAIL_SMTP_HOST` est renseigné (Brevo recommandé, français), sinon envoi no-op loggé. Gabarits : décision de candidature, contrat prêt, relance avant suppression d'un compte inactif. `send` ne lève jamais et renvoie le statut de remise, dont dépend la suppression des comptes inactifs.
- **Web Push (VAPID) · GAP** : à porter (notifications navigateur, alertes perdus/trouvés).
- Déclencheurs cibles : nouveau « trouvé » dans le rayon d'un « perdu » actif, mise à jour candidature/contrat, nouvel animal dans un refuge suivi.

> **Gaps restants** (PAS encore couverts par l'API) : Web Push (VAPID), upload vocal mobile (`/uploads/voice`), annuaire GIF, réinitialisation de mot de passe, OpenAPI exhaustif. L'auth (JWT + scrypt), le matching PostGIS, les uploads et tous les modules métier sont, eux, en place et testés.

## Roadmap

Le plan MVP d'origine et son journal d'avancement vivent dans **[docs/ROADMAP.md](docs/ROADMAP.md)**. Le périmètre MVP est livré sur la stack actuelle ; les pistes post-MVP sont dans [docs/ROADMAP-V2.md](docs/ROADMAP-V2.md).

## Notes importantes pour Claude

- Ce projet est un MVP solo · privilégier la simplicité et la vitesse de livraison à l'architecture parfaite.
- Ne pas sur-engineer : pas de microservices, pas de message queue, pas de cache Redis pour le MVP.
- L'app est destinée au grand public (adoptants, propriétaires d'animaux) : l'UX doit être simple, chaleureuse, et mobile-first.
- L'espace refuge est un back-office secondaire : fonctionnel mais pas besoin d'être aussi léché que la partie publique.
- PostGIS est essentiel pour le matching géographique · ne pas proposer d'alternative NoSQL ou de calcul géo côté client.
- Le projet vise la souveraineté numérique européenne : pas d'AWS, pas de services Google/Microsoft en infra. Hetzner, Scaleway, OVH uniquement.
- Les pages publiques (catalogue adoption, signalements) doivent être accessibles sans compte. L'auth est requise uniquement pour : signaler, candidater, gérer un refuge, favoris.
- Le matching perdu/trouvé est le différenciateur technique du projet. L'algo doit être simple mais efficace, et les résultats affichés clairement avec le score et la distance.
- Toujours proposer le code en français pour les commentaires et messages utilisateur, en anglais pour le code technique (noms de variables, fonctions, etc.).
- **RGPD** (cf. docs/RGPD.md) : aucune ressource servie par un CDN tiers dans les fronts (les polices sont auto-hébergées via `packages/ui/src/fonts.css`) ; aucun cookie non essentiel, donc pas de bandeau de consentement · l'ajouter romprait cette exemption. La politique de confidentialité publiée (`apps/web` · `PrivacyPage.tsx`) décrit ce que le code fait réellement : toute évolution du modèle de données ou des durées de purge (`identity/retention.service.ts`) doit être répercutée dans les deux sens.
- L'app doit donner envie d'adopter : belles photos d'animaux, fiches détaillées, ton bienveillant. Ce n'est pas un outil admin, c'est une vitrine pour aider à trouver des foyers.
