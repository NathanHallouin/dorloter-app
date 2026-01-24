# CLAUDE.md · Dorloter

## Identité du projet

Dorloter est une plateforme web française d'adoption et de retrouvailles d'animaux domestiques. MVP centré sur **chat et chien** ; extensible aux NAC (lapin, rongeur, reptile…) sans refonte. Trois fonctions :

1. **Adoption** · vitrine des refuges et associations, profils d'animaux à adopter (photos, caractère, besoins médicaux, compatibilités). Matching adoptant/animal en swipe ou en liste filtrée, formulaire de candidature en ligne, suivi du processus.

2. **Perdus / Trouvés** · réseau de signalement géolocalisé. Les particuliers signalent un animal perdu ou trouvé, le système rapproche automatiquement les signalements par localisation, espèce, description physique et date. Notifications aux utilisateurs proches.

3. **Pensions** · annuaire des pensions professionnelles agréées (chatteries, chenils). **Pros uniquement** · SIRET et agrément préfecture vérifiés manuellement par l'équipe Dorloter avant publication. Pas de garde entre particuliers, pas de booking intégré en MVP · contact téléphone/email direct.

Domaine : `dorloter.fr`. Projet solo, développeur fullstack freelance basé en France. Priorité MVP : un prototype fonctionnel, pas une architecture parfaite.

## Stack technique

Monorepo polyglotte (`apps/`). L'API est un service séparé ; les fronts la consomment via `/api/v1`.

> **API en NestJS.** L'API vit dans **`apps/api`** et est écrite en **TypeScript (NestJS + Kysely)** ; elle remplace une ancienne implémentation Rust (supprimée), elle-même issue d'un portage NestJS. Le contrat a été préservé à l'identique : même schéma `dorloter_api`, mêmes migrations, mêmes hashes scrypt, même enveloppe d'API et mêmes codes d'erreur · `packages/api-client` (client mobile typé) reste donc valide sans régénération. Deux features ont été retirées du produit : l'**annuaire vétérinaire** et le **TNR (chats libres)**.

**API · `apps/api`** (le backend, NestJS)
- **Framework** : NestJS 11 (Express) · monolithe modulaire (1 dossier par domaine dans `src/modules/`)
- **Langage** : TypeScript strict (`noUncheckedIndexedAccess`), CommonJS, cible ES2023
- **Accès DB** : Kysely + `pg` (SQL-first, requêtes typées depuis `infra/database/schema.ts` · pas d'ORM, colle au schéma existant). Parseurs pg ajustés : `bigint`/`numeric` en nombres, `date` en `yyyy-mm-dd`
- **PostGIS** : SQL natif via le template `sql` de Kysely (`ST_DWithin`/`ST_Distance` sur `::geography` ; géo écrite via `ST_SetSRID(ST_MakePoint(lng,lat),4326)`, lue via `ST_Y`/`ST_X`)
- **Auth** : JWT HS256 (`jsonwebtoken`) · scrypt Better Auth reproduit au bit près (`node:crypto` `scryptSync` + normalisation NFKC, test d'interop) · garde `@Auth()` + décorateur `@CurrentUser()`
- **Migrations schéma** : migrateur maison au démarrage (`.sql` de `apps/api/migrations`, copiés dans `dist/migrations` au build · compat `flyway_schema_history`, avec connexion DDL dédiée optionnelle `ConnectionStrings__Migrations`)
- **Validation** : `class-validator` sur les DTOs via le `ValidationPipe` global. Enum de CORPS invalide -> `VALIDATION_FAILED` ; enum en filtre de QUERY -> `INVALID_PARAM` ; enum validé dans un service -> `UNPROCESSABLE`
- **OpenAPI** : document servi sur `/api/v1/openapi` (partiel · annotation exhaustive = dernier chantier ; le client typé existant reste valide car iso-contrat)
- **Email** : `infra/email` (no-op loggé ; transport SMTP réel à brancher, gabarits portés)
- **Tests** : `bun test src` (interop scrypt, scoring matching) ; flux exercés end-to-end contre PostGIS

**Fronts (DEUX SPA distinctes, design system + couche API partagés)**
- **web · `apps/web`** : SPA PUBLIQUE (vitrine adoptants) · React 19 + Vite + React Router + TanStack Query · port 5173 · `dorloter.fr`
- **pro · `apps/pro`** : SPA ESPACE PRO (back-office) · consoles refuge / pension + admin plateforme · port 5174 · `pro.dorloter.fr`. Shell console `DashShell`, aiguillage par rôle (`ConsoleHome`), garde `RequirePro` (rôle pro OU appartenance refuge).
- **mobile · `apps/mobile`** : Expo / React Native + client `openapi-fetch` typé (`packages/api-client`)

**Packages partagés**
- **`packages/ui`** (`@dorloter/ui`) : design system (primitives, Icon, helper `cn`, thème CSS `theme.css`) · consommé par web + pro. NB Tailwind v4 : `@source` requis pour scanner le package hors `node_modules`.
- **`packages/client`** (`@dorloter/client`) : couche d'accès API (client HTTP JWT + refresh, types, modules domaine, `AuthContext`, `queryClient`) · consommée par web + pro.
- **`packages/api-client`** (`@dorloter/api-client`) : client openapi-fetch typé généré depuis l'OpenAPI de l'API · consommé par le mobile.
- Séparation public/pro sans duplication : web et pro partagent `ui` + `client`. L'API (permissions par module) reste la frontière de sécurité.

**Commun**
- **Base de données** : PostgreSQL 18 + PostGIS (schéma `dorloter_api`)
- **UI** (fronts) : Tailwind CSS v4 (config CSS-first via `@theme`, thème dans `packages/ui`) + primitives maison
- **Cartographie** : MapLibre GL JS via react-map-gl
- **Upload images** : S3-compatible (MinIO en dev, OVH/Scaleway Object Storage en prod) · presign à porter sur l'API (gap)
- **Notifications** : centre in-app persisté (porté) · email transactionnel SMTP no-op (transport à brancher) · Web Push (VAPID) à porter (gap)
- **Monorepo** : bun workspaces (Turborepo retiré)
- **Infra** : Docker Compose (dev), VPS européen France (OVH/Scaleway, prod), Caddy (reverse proxy + HTTPS)
- **CI** : GitHub Actions (portable Forgejo Actions pour Codeberg)

## Architecture du projet

Monorepo (`apps/`). L'API est un service NestJS séparé (monolithe modulaire à bounded contexts) ; les fronts la consomment via `/api/v1`.

```
apps/
├── api/                # API REST NestJS (Kysely + PostGIS) · port 8080 · LE BACKEND
│   ├── src/
│   │   ├── modules/             # Bounded contexts : identity, adoption, shelters,
│   │   │                        #   lostfound, pensions, notifications,
│   │   │                        #   gamification, moderation, messaging
│   │   │                        #   (par module : *.module.ts + *.service.ts + *.controller.ts)
│   │   ├── shared/              # app-error (AppError/ErrorCode), api-response (ok/page),
│   │   │                        #   cursor, db-enum (validation filtres/corps), validation, format
│   │   ├── infra/               # database (Kysely + schema.ts + migrator compat Flyway),
│   │   │                        #   security (jwt, scrypt, Auth/CurrentUser), email, web (health, openapi)
│   │   └── config.ts · config.module.ts · app.module.ts · main.ts
│   └── migrations/         # .sql (schéma dorloter_api), appliqués au démarrage, copiés dans dist/
│
├── web/                          # Front SPA PUBLIC (vitrine adoptants) · React 19 + Vite (port 5173)
├── pro/                          # Front SPA ESPACE PRO (consoles refuge/pension + admin) · port 5174 · pro.dorloter.fr
└── mobile/                       # Expo / React Native · client packages/api-client

packages/ui/                     # Design system partagé (primitives, Icon, thème CSS) · web + pro
packages/client/                 # Couche API partagée (client JWT+refresh, types, modules domaine, auth, queryClient) · web + pro
packages/api-client/             # Client openapi-fetch typé (mobile, généré depuis l'OpenAPI de l'API via `bun api:types`)
```

**Deux fronts web** : `apps/web` (public, dorloter.fr) et `apps/pro` (back-office pros, pro.dorloter.fr), partageant `@dorloter/ui` + `@dorloter/client`. L'API (permissions par module) reste la frontière de sécurité, identique pour les deux.

**Frontières inter-modules (API)** : un module n'accède à un autre QUE via les providers publics que celui-ci exporte (ex. `ShelterDirectory`, `ShelterMembershipService`, `UserDirectory`, `NotificationsService`), jamais via ses structures internes. Ces providers sont listés dans le `exports` du module Nest correspondant.

**Contrat d'API stable** : enveloppe `{ data }` (objet) / `{ data, pagination }` (liste paginée cursor) / `{ error: { code, message, details? } }`. Codes d'erreur stables (`ErrorCode`), routes sous `/api/v1`. Ce contrat est partagé par les 2 clients (web SPA, mobile).

## Modèle de données

### Tables métier

**pets** · animaux à adopter (gérés par les refuges)
- `id` : UUID (pk, gen_random_uuid)
- `shelter_id` : UUID (fk → shelters), not null
- `species` : enum('chat', 'chien') · enum extensible pour les NAC à terme
- `name` : varchar(255), not null
- `description` : text · personnalité, histoire
- `breed` : varchar(100) · race ("Européen", "Golden retriever", "Croisé"...)
- `color` : varchar(100) · couleur du pelage
- `sex` : enum('male', 'femelle', 'inconnu')
- `age_category` : enum('chaton', 'jeune', 'adulte', 'senior') · "chaton" couvre aussi le chiot
- `estimated_birth` : date · nullable, approximatif
- `is_sterilized`, `is_chipped`, `is_vaccinated` : boolean
- `fiv_felv` : enum('negatif', 'fiv_positif', 'felv_positif', 'fiv_felv_positif', 'non_teste') · **nullable, chat uniquement**
- `indoor_only` : boolean · **nullable, chat uniquement**
- `ok_with_cats`, `ok_with_dogs`, `ok_with_children` : enum('oui', 'non', 'inconnu')
- `special_needs` : text · besoins spécifiques (régime, médicaments...)
- `status` : enum('disponible', 'reserve', 'adopte', 'retire')
- `adoption_fee` : decimal(8,2) · frais d'adoption
- `created_at`, `updated_at` : timestamp

Les champs `fiv_felv` et `indoor_only` sont **nullables** : le formulaire les masque si `species != 'chat'`. Côté UI, toujours null-checker avant affichage.

**pet_photos** · plusieurs photos par animal (galerie)
- `id` : UUID (pk)
- `pet_id` : UUID (fk → pets)
- `url` : text, not null
- `is_primary` : boolean · photo principale affichée en card
- `order` : integer · ordre dans la galerie
- `created_at` : timestamp

**reports** · signalements perdu/trouvé
- `id` : UUID (pk)
- `user_id` : UUID (fk → users), not null
- `type` : enum('perdu', 'trouve'), not null
- `status` : enum('actif', 'resolu', 'expire')
- `species` : enum('chat', 'chien'), not null
- `pet_name` : varchar(255) · nullable (trouvé = pas de nom)
- `description` : text, not null · description physique détaillée
- `breed` : varchar(100)
- `color` : varchar(100)
- `sex` : enum('male', 'femelle', 'inconnu')
- `is_chipped` : boolean
- `chip_number` : varchar(50) · si connu
- `distinctive_signs` : text · cicatrice, oreille coupée, collier...
- `location` : geography(Point, 4326), not null · PostGIS, lieu de perte/découverte
- `address` : text · adresse lisible
- `date_event` : date, not null · date de perte ou découverte
- `contact_phone` : varchar(20)
- `contact_email` : varchar(255)
- `notes` : text
- `created_at`, `updated_at` : timestamp

**report_photos** · photos du signalement
- `id` : UUID (pk)
- `report_id` : UUID (fk → reports)
- `url` : text, not null
- `is_primary` : boolean
- `order` : integer
- `created_at` : timestamp

**report_matches** · correspondances suggérées entre perdu et trouvé
- `id` : UUID (pk)
- `lost_report_id` : UUID (fk → reports), not null · le signalement "perdu"
- `found_report_id` : UUID (fk → reports), not null · le signalement "trouvé"
- `score` : decimal(5,2) · score de similarité (0-100)
- `distance_meters` : integer · distance entre les deux points
- `status` : enum('suggere', 'confirme', 'rejete')
- `created_at` : timestamp

**applications** · candidatures d'adoption
- `id` : UUID (pk)
- `pet_id` : UUID (fk → pets), not null
- `user_id` : UUID (fk → users), not null
- `status` : enum('envoyee', 'en_cours', 'acceptee', 'refusee', 'annulee')
- `housing_type` : enum('appartement', 'maison', 'autre')
- `has_outdoor_access` : boolean
- `has_other_pets` : text · description des autres animaux
- `has_children` : boolean
- `children_ages` : text · âges des enfants
- `experience` : text · expérience avec les animaux
- `motivation` : text, not null · pourquoi cet animal
- `availability` : text · disponibilité pour visite/rencontre
- `shelter_notes` : text · notes internes du refuge
- `created_at`, `updated_at` : timestamp

**favorites** · animaux favoris d'un utilisateur
- `user_id` : UUID (fk → users)
- `pet_id` : UUID (fk → pets)
- `created_at` : timestamp
- PK composite : (user_id, pet_id)

**pensions** · pensions professionnelles agréées (chats et/ou chiens)
- `id` : UUID (pk)
- `name` : varchar(255), not null
- `slug` : varchar(255), unique
- `description` : text
- `siret` : varchar(14), not null · obligatoire, vérification manuelle
- `agrement_number` : varchar(100) · certificat de capacité ou ICPE
- `address`, `location` (PostGIS), `phone`, `email`, `website`
- `accepts_cats`, `accepts_dogs` : boolean
- `capacity_cats`, `capacity_dogs` : integer
- `price_per_day_cat`, `price_per_day_dog` : decimal(6,2)
- `services` : jsonb (medication, grooming, outdoorAccess, nightStaff, transport, senior)
- `opening_hours` : text
- `is_verified` : boolean · contrôlé manuellement par un platform_admin ; seules les fiches vérifiées apparaissent dans l'annuaire public
- `created_at`, `updated_at` : timestamp

**pension_photos** · galerie d'une pension
- `id` : UUID (pk), `pension_id` : UUID (fk → pensions), `url`, `is_primary`, `order`, `created_at`

Règles pensions : uniquement des pros (SIRET requis), pas de particuliers. Un user peut créer une pension et devient `pension_admin` ; la fiche reste `is_verified=false` jusqu'à validation par un admin plateforme.

**shelters** · refuges et associations partenaires
- `id` : UUID (pk)
- `name` : varchar(255), not null
- `slug` : varchar(255), unique · URL friendly
- `description` : text
- `siret` : varchar(14)
- `address` : text
- `location` : geography(Point, 4326) · PostGIS
- `phone` : varchar(20)
- `email` : varchar(255)
- `website` : text
- `logo_url` : text
- `cover_url` : text
- `is_verified` : boolean · vérifié par l'admin plateforme
- `created_at`, `updated_at` : timestamp

**contracts** · contrats d'adoption et conventions de famille d'accueil (back-office refuge · table unifiée · migration V18 · module Adoption)
- `id` : UUID (pk)
- `type` : enum('adoption', 'foster')
- `status` : enum('brouillon', 'envoye', 'signe', 'active', 'terminee', 'resilie', 'annule') · adoption : brouillon→envoye→signe(→resilie) ; foster : brouillon→active→terminee
- `shelter_id` : UUID (fk → shelters), not null · `user_id` : UUID (fk → users), not null (adoptant ou famille d'accueil)
- `pet_id` : UUID (fk → pets) nullable · `application_id` : UUID (fk → applications) nullable (issu d'une candidature acceptée) · `foster_family_id` : UUID (fk → foster_families) nullable
- `reference` : varchar(40) · unique par refuge
- `effective_date`, `end_date` : date nullable · `adoption_fee` : decimal(8,2) nullable
- `terms` : jsonb · clauses cochées (adoption : stérilisation, droit de suite, non-abandon, restitution… ; foster : propriété asso, frais véto pris en charge…)
- `notes` : text · `signed_at`, `created_at`, `updated_at` : timestamp

Règles contrats : à la signature d'une adoption (`status=signe`), l'animal passe `status=adopte`. Permissions via `ShelterMembership` (adoption → `Applications*`, foster → `Fosters*`). Voir docs/CONTRATS.md.

**adoption_followups** · suivi post-adoption (back-office refuge · migration V26 · module Adoption)
- `id` : UUID (pk) · `contract_id` : UUID (fk → contracts), not null · `shelter_id` : UUID (fk → shelters), not null
- `pet_id` : UUID (fk → pets) nullable · `user_id` : UUID (fk → users), not null (l'adoptant)
- `label` : varchar(60) · `due_date` : date · `status` : enum('a_faire', 'fait', 'annule') · `notes` : text · `completed_at` : timestamp
- Trois relances (J+7, J+30, J+90) créées automatiquement à la signature d'une adoption (`AdoptionFollowupsService.createForContract`, idempotent). **Pas de planificateur** : les échéances dues sont remontées par requête (liste back-office), le refuge les traite et les coche. Permissions `Applications*`.

**response_templates** · modèles de réponses aux candidatures (back-office refuge · migration V25 · module Shelters)
- `id` : UUID (pk) · `shelter_id` : UUID (fk → shelters), not null
- `category` : enum('acceptation', 'refus', 'infos', 'rdv', 'generique') · `name` : varchar(120) · `subject` : varchar(255) nullable · `body` : text
- Variables `{{prenomCandidat}}` / `{{nomAnimal}}` / `{{nomRefuge}}` résolues côté client au moment de l'usage. Permissions `Communications*`.

**notifications** · notifications persistées
- `id` : UUID (pk)
- `user_id` : UUID (fk → users), not null
- `type` : enum('match_found', 'application_update', 'new_cat_nearby', 'report_nearby')
- `title` : varchar(255)
- `body` : text
- `data` : jsonb · payload (lien, IDs concernés)
- `is_read` : boolean, default false
- `created_at` : timestamp

### Tables auth

Le schéma `dorloter_api` contient `users`, `accounts` et `auth_refresh_tokens`. L'auth de l'API est en **JWT** (access + refresh opaque en base, table `auth_refresh_tokens`), pas en sessions. Le hash `accounts.password` est au format **scrypt de Better Auth** · l'API le lit et l'écrit à l'identique (interop des comptes importés, reproduit au bit près). Les tables `sessions` / `verifications` ci-dessous sont l'héritage de Better Auth (ancien front Next.js, retiré) · l'API ne les utilise pas.

**users**
- `id` : UUID (pk)
- `email` : varchar(255), unique, not null
- `email_verified` : boolean
- `name` : varchar(255), not null
- `image` : text · avatar
- `role` : enum('user', 'shelter_admin', 'pension_admin', 'platform_admin')
- `shelter_id` / `pension_id` : UUID · nullable, rattachement pro (refuge / pension)
- `location` : geometry(Point, 4326) · localisation utilisateur (migration V27 · digest de proximité, posée depuis le profil)
- `notification_radius_km` : integer, default 25 · rayon du digest « Nouveautés dans votre rayon »
- `digest_optin` : boolean, default true · réception du digest (migration V27 · module Adoption `adoption-digest.controller.ts`)
- `push_subscription` : jsonb · Web Push subscription · **GAP** (colonne non encore créée ; Web Push VAPID à porter)
- `phone` : varchar(20)
- `created_at`, `updated_at` : timestamp

**sessions** · héritage Better Auth · NON utilisée par l'API
- `id` : varchar(255) (pk)
- `user_id` : UUID (fk → users)
- `token` : varchar(255)
- `expires_at` : timestamp
- `ip_address` : text
- `user_agent` : text
- `created_at`, `updated_at` : timestamp

**accounts** · credentials · lue et écrite par l'API (colonne `password` au format scrypt Better Auth)
- `id` : varchar(255) (pk)
- `user_id` : UUID (fk → users)
- `account_id` : varchar(255)
- `provider_id` : varchar(255)
- `access_token`, `refresh_token` : text
- `expires_at` : timestamp
- `password` : text

**verifications** · héritage Better Auth · NON utilisée par l'API
- `id` : varchar(255) (pk)
- `identifier` : varchar(255)
- `value` : varchar(255)
- `expires_at` : timestamp
- `created_at`, `updated_at` : timestamp

### Relations clés
- Un refuge a plusieurs animaux et un ou plusieurs admins (users avec role shelter_admin).
- Un animal a plusieurs photos (pet_photos) et peut recevoir plusieurs candidatures (applications).
- Un utilisateur peut avoir plusieurs signalements (reports), plusieurs candidatures, et plusieurs favoris.
- Un signalement a plusieurs photos (report_photos) et peut être mis en correspondance avec d'autres signalements (report_matches).
- Une correspondance lie toujours un signalement "perdu" à un signalement "trouvé".

### Index recommandés
- `reports.location` : index GIST (requêtes spatiales, matching)
- `shelters.location` : index GIST
- `users.location` : index GIST (notifications proximité)
- `pets.shelter_id` : index B-tree
- `pets.status` : index B-tree (filtrage sur "disponible")
- `reports.type` + `reports.status` : index composite
- `reports.date_event` : index B-tree (tri chronologique)
- `report_matches.lost_report_id` : index B-tree
- `report_matches.found_report_id` : index B-tree
- `applications.cat_id` + `applications.status` : index composite
- `favorites.user_id` : index B-tree
- `notifications.user_id` + `notifications.is_read` : index composite
- `users.email` : unique index

### Algo de matching perdu/trouvé

Le matching (`modules/lostfound` : `match-score.ts` pour le scoring pur avec tests unitaires, `matching.service.ts` + `lostfound.service.ts` pour le géo en SQL natif PostGIS) calcule un score (0-100) entre un signalement "perdu" et les signalements "trouvé" actifs, basé sur :

- **Distance géographique** (40 pts max) : ST_Distance entre les deux points. < 1 km = 40 pts, 1-5 km = 30 pts, 5-15 km = 20 pts, 15-30 km = 10 pts, > 30 km = 0 pts.
- **Couleur du pelage** (25 pts max) : correspondance exacte = 25 pts, partielle (ex. "noir et blanc" vs "noir") = 15 pts.
- **Race** (15 pts max) : correspondance exacte = 15 pts. "Inconnu" des deux côtés = 5 pts (neutre).
- **Sexe** (10 pts max) : correspondance = 10 pts. "Inconnu" = 5 pts.
- **Fenêtre temporelle** (10 pts max) : date trouvé >= date perdu et écart < 7 jours = 10 pts, < 14 jours = 7 pts, < 30 jours = 3 pts.

Seuil d'affichage : score >= 40. Les matches sont recalculés à chaque nouveau signalement et stockés dans `report_matches`.

## Conventions de code

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

### API NestJS (`apps/api`)
- Un module = `<nom>.module.ts` + `<nom>.service.ts` (logique métier + SQL) + `<nom>.controller.ts` (routes, DTOs, mapping de sortie). Les features de back-office volumineuses ont leur propre paire (ex. `adoption-contracts.controller.ts`) ; un contrôleur court peut porter son SQL directement.
- Toujours renvoyer l'enveloppe via les helpers `ok(...)` / `page(..., nextCursor)` (pas d'intercepteur global : les 204 restent sans corps). Erreurs métier via `AppError` (`notFoundId`/`forbidden`/`conflict`/...) · jamais d'erreur technique exposée (le filtre global loggue et renvoie un 500 générique).
- Auth : protection PAR HANDLER via `@Auth()` (absent = endpoint public), identité via `@CurrentUser()`. `current.requireRole('platform_admin')` pour le réservé plateforme.
- Autorisation refuge par PERMISSION via `membership.requireAccess(userId, 'pets:write')` (PAS par rôle JWT : un membre invité a `role=user` mais des permissions d'équipe).
- Validation : DTOs `class-validator` avec messages français explicites (un message par contrainte). Enum invalide dans le CORPS -> `VALIDATION_FAILED` (`bodyEnumReq`/`bodyEnumOpt` ou `@IsIn`) ; en FILTRE de query -> `INVALID_PARAM` (`validateFilter`) ; validé dans un service -> `UNPROCESSABLE` (`ensureValue`).
- DB : Kysely (pas d'ORM), requêtes explicites sur le schéma `dorloter_api` typé dans `infra/database/schema.ts`. Enums métier lus/écrits comme `string` (valeur DB française réémise telle quelle) ; décimaux `numeric` castés `::float8` ; colonnes `jsonb` en valeur JSON.
- PostGIS : écrire les points via `` sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` ``, lire via `ST_Y`/`ST_X` ; matching/proximité en SQL natif avec cast `::geography` (mètres géodésiques).
- Pagination obligatoire sur les listings : cursor keyset (`created_at DESC, id DESC` via `shared/cursor`).
- DTOs de sortie en camelCase (mapping explicite depuis les colonnes snake_case) ; dates `timestamptz` en RFC 3339, `date` en `yyyy-mm-dd`.


### Composants (fronts)
- Props typées avec interface dédiée, pas de `any`
- **apps/web (Vite SPA)** : consomme l'API via le client typé (`packages/api-client`) + TanStack Query ; routing React Router
- **apps/mobile (Expo)** : même client typé ; React Native
- Composants de formulaire dans le même dossier que leur domaine

### Style
- Tailwind CSS v4 uniquement : configuration via `@theme` dans le CSS (pas de `tailwind.config.js`)
- Mobile-first obligatoire : le catalogue adoption et les signalements seront principalement consultés sur mobile
- Composants shadcn/ui comme base, customisés via Tailwind
- Palette : tons chaleureux (ambre, terre, crème) avec accent teal pour les actions · l'app doit donner envie d'adopter
- Dark mode supporté via Tailwind `dark:`
- Plugin `@tailwindcss/vite` côté `apps/web` (Vite)

### Cartographie
- MapLibre GL JS via `react-map-gl` (wrapper React)
- Tuiles : OpenFreeMap ou Protomaps (gratuit, open-source)
- GeoJSON pour les données signalements et refuges
- Cluster automatique quand zoom < 12
- Popup au clic sur marqueur, pas au survol (mobile-friendly)
- `location-picker.tsx` : composant réutilisable pour sélectionner un point sur la carte (formulaires signalement, profil)

- **Centre in-app · EN PLACE** : notifications persistées (table `notifications`) + endpoints `notifications` (list/unread-count/read/read-all) et devices Expo. `NotificationsService.publish()` exporté pour usage inter-modules.
- **Email transactionnel · GAP** : `infra/email` actuellement no-op loggé (gabarits en place : décision de candidature, contrat prêt). Le transport SMTP réel (Brevo recommandé, français) reste à brancher. Ne lève jamais.
- **Web Push (VAPID) · GAP** : à porter (notifications navigateur, alertes perdus/trouvés).
- Déclencheurs cibles : nouveau "trouvé" dans le rayon d'un "perdu" actif, mise à jour candidature/contrat, nouvel animal dans un refuge suivi.

## Commandes

```bash
# Base de données + stockage (à la racine)
docker compose up -d                          # PostgreSQL + PostGIS (port 5438) + MinIO
bun db:seed                                   # seed données de test (scripts/seed.sql, idempotent)

# API NestJS · apps/api (port 8080) · LE BACKEND
cd apps/api
bun dev                                       # nest start --watch (migre le schéma au démarrage)
bun run build                                 # nest build -> dist/ (+ copie des migrations)
bun start                                     # node dist/main.js (mode prod local)
bun run typecheck                             # tsc --noEmit
bun test src                                  # tests unitaires (interop scrypt, scoring matching)
# Image de prod (contexte autonome = apps/api, migrations copiées dans l'image) :
# docker build -t dorloter-api apps/api
# ou : docker compose --profile api up --build

# Front SPA public · apps/web (port 5173)
cd apps/web
bun dev                                       # Vite dev (proxy /api → localhost:8080)
bun run build                                 # typecheck + build prod
bun run typecheck                             # tsc --noEmit

# Front SPA espace pro · apps/pro (port 5174) · consoles refuge/pension + admin
cd apps/pro && bun dev                        # Vite dev (proxy /api → localhost:8080)

# Racine (bun workspaces, sans Turbo) : tâches sur tous les workspaces
bun run typecheck                             # = bun run --filter='*' typecheck
bun run build                                 # = bun run --filter='*' build

# Mobile · apps/mobile
cd apps/mobile && bun start                   # Expo

# Client API typé (depuis l'OpenAPI · API lancée sur :8080)
# NB : l'OpenAPI servi est encore partiel ; le client committé reste valide (iso-contrat).
bun api:types                                 # régénère packages/api-client/src/types.gen.ts
```

## Variables d'environnement

```env
# API NestJS (apps/api) · en dev, les défauts sont dans le code (config.ts, DB sur :5438)
ConnectionStrings__Default=Host=localhost;Port=5438;Database=dorloter;Username=dorloter;Password=dorloter;Search Path=dorloter_api,public
Dorloter__Security__Jwt__Secret=...            # >= 32 octets (openssl rand -base64 48)
Dorloter__Security__Jwt__Issuer=dorloter-api
Dorloter__Security__CorsAllowedOrigins=http://localhost:5173
# Optionnels : ConnectionStrings__Migrations (rôle DDL dédié), Dorloter__Database__AutoMigrate=false, BIND_ADDR

# Email transactionnel · GAP : l'émetteur est actuellement no-op loggé.
# Le transport SMTP réel (Brevo recommandé, français) reste à brancher ; les
# variables d'env seront à recâbler (Dorloter__Email__* ou EMAIL_*) à ce moment-là.

# Fronts (apps/web public + apps/pro espace pro + apps/mobile)
VITE_API_PROXY=http://localhost:8080            # apps/web & apps/pro · cible du proxy /api en dev
VITE_MAP_STYLE=...                              # style MapLibre (ou OpenFreeMap sans clé)
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1   # apps/mobile
```

> **Gaps restants** (PAS encore couverts par l'API) : presign d'upload d'images (S3/MinIO), Web Push (VAPID), transport SMTP réel des emails transactionnels (Brevo · l'émetteur est no-op loggé), OpenAPI exhaustif. L'auth (JWT + scrypt), le matching PostGIS et tous les modules métier sont, eux, en place et testés.

## Roadmap MVP

> **Statut** : la roadmap ci-dessous est le plan d'origine (historique). Le périmètre MVP est aujourd'hui **livré** sur la stack actuelle (API NestJS `apps/api`, deux SPA React `apps/web` + `apps/pro`, mobile Expo). Les mentions Next.js / Drizzle / Better Auth-front datent du plan initial et ne reflètent plus l'implémentation. Gaps restants : voir la note « Gaps restants » plus haut.

### Phase 1 · Fondations + adoption
- [x] Setup projet (Docker Compose, CI)
- [x] Auth (inscription, connexion, rôles ; JWT + scrypt Better Auth)
- [x] Protection des routes (garde `RequirePro`, permissions par module côté API)
- [ ] CRUD refuges + page publique refuge
- [ ] CRUD animaux à adopter (formulaire multi-photos, tous les champs)
- [ ] Catalogue public : grille de cards, filtres (race, âge, sexe, compatibilité), pagination
- [ ] Fiche détaillée animal avec galerie photos
- [ ] Système de favoris (coeur sur les cards)
- [ ] Upload images vers S3 + optimisation (sharp ou next/image)

### Phase 2 · Perdus/trouvés + matching (5-6 semaines)
- [ ] Formulaire signalement perdu/trouvé (localisation carte, photos, description)
- [ ] Carte interactive des signalements (MapLibre)
- [ ] Algo de matching automatique (score basé distance + description)
- [ ] Page correspondances pour un signalement
- [ ] Composant location-picker réutilisable
- [ ] Gestion des statuts (actif → résolu)
- [ ] Page "mes signalements"

### Phase 3 · Candidatures + notifications (4-5 semaines)
- [ ] Formulaire de candidature adoption
- [ ] Espace refuge : réception et gestion des candidatures
- [ ] Notifications Web Push (nouveau match, mise à jour candidature)
- [ ] Notifications email (fallback)
- [ ] Centre de notifications in-app
- [ ] Dashboard stats refuge (nombre de vues, candidatures, adoptions)

### Phase 4 · Polish + lancement (3-4 semaines)
- [ ] Landing page publique attractive
- [ ] SEO (metadata, sitemap, structured data pour les animaux)
- [ ] PWA (manifest, service worker, install prompt)
- [ ] Responsive final pass sur tous les écrans
- [ ] Seed script avec données réalistes pour démo
- [ ] Déploiement prod (Hetzner/Scaleway)

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
- L'app doit donner envie d'adopter : belles photos d'animaux, fiches détaillées, ton bienveillant. Ce n'est pas un outil admin, c'est une vitrine pour aider à trouver des foyers.
