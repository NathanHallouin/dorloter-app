# CLAUDE.md · Dorloter

## Identité du projet

Dorloter est une plateforme web française d'adoption et de retrouvailles d'animaux domestiques. MVP centré sur **chat et chien** ; extensible aux NAC (lapin, rongeur, reptile…) sans refonte. Trois fonctions :

1. **Adoption** · vitrine des refuges et associations, profils d'animaux à adopter (photos, caractère, besoins médicaux, compatibilités). Matching adoptant/animal en swipe ou en liste filtrée, formulaire de candidature en ligne, suivi du processus.

2. **Perdus / Trouvés** · réseau de signalement géolocalisé. Les particuliers signalent un animal perdu ou trouvé, le système rapproche automatiquement les signalements par localisation, espèce, description physique et date. Notifications aux utilisateurs proches.

3. **Pensions** · annuaire des pensions professionnelles agréées (chatteries, chenils). **Pros uniquement** · SIRET et agrément préfecture vérifiés manuellement par l'équipe Dorloter avant publication. Pas de garde entre particuliers, pas de booking intégré en MVP · contact téléphone/email direct.

Domaine : `dorloter.fr`. Projet solo, développeur fullstack freelance basé en France. Priorité MVP : un prototype fonctionnel, pas une architecture parfaite.

## Stack technique

Monorepo polyglotte (`apps/`). L'API est un service NestJS séparé ; les fronts la consomment via `/api/v1`.

**API · `apps/api`** (le backend principal)
- **Framework** : le service API (contrôleurs · monolithe modulaire)
- **Langage** : C# (NestJS 10)
- **ORM** : Entity Framework Core 10, mappé sur le schéma `dorloter_api` existant (pas de migrations EF)
- **PostGIS** : PostGIS via Npgsql (matching en SQL natif `ST_DWithin`/`ST_Distance` sur `::geography`)
- **Auth** : JWT (access 15 min + refresh 30 j opaque, rotation) · hash scrypt compatible Better Auth (import des comptes existants sans reset)
- **Migrations schéma** : `DatabaseMigrator` au démarrage (fichiers `.sql` embarqués · compatible avec un schéma déjà géré par Flyway)
- **Validation** : DataAnnotations (sur les paramètres de record)
- **OpenAPI** : Microsoft.AspNetCore.OpenApi, servi sur `/api/v1/openapi`
- **Email** : transactionnel via SMTP (SMTP), provider-agnostique (`Infrastructure/Email`, section `Dorloter:Email`). Brevo recommandé (français). Voir docs/EMAIL.md.
- **Tests** : xUnit + Testcontainers (PostGIS)

**Fronts (DEUX SPA distinctes, design system + couche API partagés)**
- **web · `apps/web`** : SPA PUBLIQUE (vitrine adoptants) · React 19 + Vite + React Router + TanStack Query · port 5173 · `dorloter.fr`
- **pro · `apps/pro`** : SPA ESPACE PRO (back-office) · consoles refuge / pension / vétérinaire + admin plateforme · port 5174 · `pro.dorloter.fr`. Shell console `DashShell`, aiguillage par rôle (`ConsoleHome`), garde `RequirePro` (rôle pro OU appartenance refuge).
- **mobile · `apps/mobile`** : Expo / React Native + client `openapi-fetch` typé (`packages/api-client`)

**Packages partagés**
- **`packages/ui`** (`@dorloter/ui`) : design system (primitives, Icon, helper `cn`, thème CSS `theme.css`) · consommé par web + pro. NB Tailwind v4 : `@source` requis pour scanner le package hors `node_modules`.
- **`packages/client`** (`@dorloter/client`) : couche d'accès API (client HTTP JWT + refresh, types, modules domaine, `AuthContext`, `queryClient`) · consommée par web + pro.
- **`packages/api-client`** (`@dorloter/api-client`) : client openapi-fetch typé généré depuis l'OpenAPI · consommé par le mobile.
- Séparation public/pro sans duplication : web et pro partagent `ui` + `client`. L'API (permissions par module) reste la frontière de sécurité.

**Commun**
- **Base de données** : PostgreSQL 16 + PostGIS (schéma `dorloter_api`)
- **UI** (fronts) : Tailwind CSS v4 (config CSS-first via `@theme`, thème dans `packages/ui`) + primitives maison
- **Cartographie** : MapLibre GL JS via react-map-gl
- **Upload images** : S3-compatible (MinIO en dev, OVH/Scaleway Object Storage en prod) · presign à porter sur NestJS (gap)
- **Notifications** : email transactionnel SMTP (porté, Brevo) · Web Push (VAPID) à porter sur NestJS (gap)
- **Monorepo** : bun workspaces (Turborepo retiré)
- **Infra** : Docker Compose (dev), VPS européen France (OVH/Scaleway, prod), Caddy (reverse proxy + HTTPS)
- **CI** : GitHub Actions (portable Forgejo Actions pour Codeberg)

## Architecture du projet

Monorepo (`apps/`). L'API est un service NestJS séparé (monolithe modulaire à bounded contexts) ; les fronts la consomment via `/api/v1`.

```
apps/
├── api/                   # API REST NestJS (le service API) · port 8080
│   ├── src/apps/api/
│   │   ├── Modules/              # Bounded contexts : 1 dossier par domaine
│   │   │   ├── Identity/         # users, accounts, refresh tokens, auth (JWT)
│   │   │   ├── Adoption/         # pets, photos, favorites, applications,
│   │   │   │                     #   back-office refuge, familles d'accueil (foster)
│   │   │   ├── Shelters/         # refuges, follows, équipes (membres + permissions)
│   │   │   ├── LostFound/        # reports, matching PostGIS, report_matches
│   │   │   ├── Pensions/         # pensions pro, bookings, reviews
│   │   │   ├── Veterinarians/    # annuaire vétérinaires
│   │   │   ├── Notifications/    # notifications + device tokens
│   │   │   ├── Gamification/     # crédits de résolution
│   │   │   ├── Moderation/       # content reports (réservé platform_admin)
│   │   │   └── Messaging/        # conversations / messages (polling)
│   │   │   # chaque module : Domain/ (entités, enums) + Application/ (services, *.cs en
│   │   │   #   namespace .Services) + Infrastructure/ (configs EF) + Web/ (contrôleurs, DTOs)
│   │   │   #   + <Module>Module.cs (enregistrement DI : Add<Module>Module())
│   │   ├── Shared/               # ApiResponse / PageResponse, DomainException / ErrorCode,
│   │   │                         #   CursorCodec, DbEnum (+ converters JSON/EF), GeoPoints, ITimestamped
│   │   ├── Infrastructure/       # Persistence (DorloterDbContext, DatabaseMigrator),
│   │   │                         #   Security (JwtService, scrypt encoder, CurrentUser), Web (exception handler)
│   │   └── Migrations/           # .sql embarqués (schéma dorloter_api), appliqués au démarrage
│   └── tests/                    # xUnit + Testcontainers (PostGIS)
│
├── web/                          # Front SPA PUBLIC (vitrine adoptants) · React 19 + Vite (port 5173)
├── pro/                          # Front SPA ESPACE PRO (consoles refuge/pension/véto + admin) · port 5174 · pro.dorloter.fr
└── mobile/                       # Expo / React Native · client packages/api-client

packages/ui/                     # Design system partagé (primitives, Icon, thème CSS) · web + pro
packages/client/                 # Couche API partagée (client JWT+refresh, types, modules domaine, auth, queryClient) · web + pro
packages/api-client/             # Client openapi-fetch typé (mobile, généré depuis l'OpenAPI via `bun api:types`)
```

**Deux fronts web** : `apps/web` (public, dorloter.fr) et `apps/pro` (back-office pros, pro.dorloter.fr), partageant `@dorloter/ui` + `@dorloter/client`. L'API (permissions par module) reste la frontière de sécurité, identique pour les deux.

**Frontières inter-modules (API)** : un module n'accède à un autre QUE via son API publique exposée au niveau du package racine du module (ex. `ShelterDirectory`, `ShelterMembership`, `UserDirectory`), jamais via ses entités internes.

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

Le schéma `dorloter_api` (API) contient `users`, `accounts` et `auth_refresh_tokens`. L'auth de l'API est en **JWT** (access + refresh opaque en base, table `auth_refresh_tokens`), pas en sessions. Le hash `accounts.password` est au format **scrypt de Better Auth** · l'API le lit et l'écrit à l'identique (interop des comptes importés). Les tables `sessions` / `verifications` ci-dessous sont l'héritage de Better Auth (ancien front Next.js, retiré) · l'API ne les utilise pas.

**users**
- `id` : UUID (pk)
- `email` : varchar(255), unique, not null
- `email_verified` : boolean
- `name` : varchar(255), not null
- `image` : text · avatar
- `role` : enum('user', 'shelter_admin', 'platform_admin')
- `shelter_id` : UUID (fk → shelters) · nullable, si admin refuge
- `location` : geography(Point, 4326) · localisation utilisateur (pour notifications proximité)
- `notification_radius_km` : integer, default 10 · rayon alertes perdus/trouvés
- `push_subscription` : jsonb · Web Push subscription
- `phone` : varchar(20)
- `created_at`, `updated_at` : timestamp

**sessions** · gérée automatiquement par Better Auth
- `id` : varchar(255) (pk)
- `user_id` : UUID (fk → users)
- `token` : varchar(255)
- `expires_at` : timestamp
- `ip_address` : text
- `user_agent` : text
- `created_at`, `updated_at` : timestamp

**accounts** · gérée automatiquement par Better Auth
- `id` : varchar(255) (pk)
- `user_id` : UUID (fk → users)
- `account_id` : varchar(255)
- `provider_id` : varchar(255)
- `access_token`, `refresh_token` : text
- `expires_at` : timestamp
- `password` : text

**verifications** · gérée automatiquement par Better Auth
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

Le matching (API · `Modules/LostFound` : `MatchScore` pour le scoring pur, `MatchingService` + `ReportSpatialQueries` pour le géo en SQL natif PostGIS) calcule un score (0-100) entre un signalement "perdu" et les signalements "trouvé" actifs, basé sur :

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

### API (`apps/api`)
- Contrôleurs fins : valider l'entrée (DataAnnotations sur les records de requête · attributs sur le PARAMÈTRE du record, jamais `[property:]`), déléguer la logique aux services (`Application/`, namespace `.Services`)
- Toujours renvoyer l'enveloppe via `ApiResponse.Of(...)` / `PageResponse.OfNextCursor(...)`. Erreurs métier via `DomainException` (`NotFound`/`Forbidden`/`Conflict`/...) · jamais d'erreur technique exposée (le gestionnaire global formate `{ error: { code, message } }`)
- Auth : routes protégées par défaut (FallbackPolicy) · `[AllowAnonymous]` sur les actions PUBLIQUES individuelles (jamais au niveau classe si la classe a aussi des actions protégées). `CurrentUser.RequireUserId()` pour l'utilisateur courant
- Autorisation refuge par PERMISSION via `ShelterMembership.RequireAccessAsync(...)` (PAS par rôle JWT : un membre invité a `role=user` mais des permissions d'équipe). Réservé plateforme : `[Authorize(Roles = "platform_admin")]`
- DB : Kysely via `DorloterDbContext` (mappé sur les tables existantes du schéma `dorloter_api`, sans migrations EF). Enums métier via `DbEnum` (`[EnumValue("valeur_fr")]` + `[JsonConverter(typeof(DbEnumJsonConverter))]` + `DbEnumConverter.For<T>()`)
- PostGIS : construire les points via `GeoPoints.Of(lng, lat)` (SRID 4326). Matching/proximité en SQL natif (`FromSqlRaw`/`SqlQueryRaw`) avec cast `::geography` (mètres géodésiques)
- Pagination obligatoire sur les listings : cursor keyset (`createdAt DESC, id DESC` via `CursorCodec`)
- `created_at`/`updated_at` : interface `ITimestamped` (stampés par le DbContext), pas à la main


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

### Notifications
- **Email transactionnel · PORTÉ** : SMTP via SMTP (`Infrastructure/Email`), provider-agnostique, Brevo recommandé (français). Déclenché sur candidature acceptée/refusée et contrat d'adoption envoyé. Ne lève jamais (no-op loggé si non configuré). Voir docs/EMAIL.md.
- **Web Push (VAPID) · gap** : à porter sur l'API (notifications navigateur, alertes perdus/trouvés).
- Déclencheurs cibles : nouveau "trouvé" dans le rayon d'un "perdu" actif, mise à jour candidature/contrat, nouvel animal dans un refuge suivi.
- Notifications persistées en base (table `notifications`) pour le centre in-app.

## Commandes

```bash
# Base de données + stockage (à la racine)
docker compose up -d                          # PostgreSQL + PostGIS (port 5438) + MinIO
bun db:seed                                   # seed données de test (scripts/seed.sql, idempotent)

# API · apps/api (port 8080)
cd apps/api
bun dev         # lance l'API (migre le schéma au démarrage)
bun run test                                   # tests xUnit + Testcontainers (PostGIS, nécessite Docker)
bun run build -c Release                       # build

# Front SPA public · apps/web (port 5173)
cd apps/web
bun dev                                       # Vite dev (proxy /api → localhost:8080)
bun run build                                 # typecheck + build prod
bun run typecheck                             # tsc --noEmit

# Front SPA espace pro · apps/pro (port 5174) · consoles refuge/pension/véto + admin
cd apps/pro && bun dev                        # Vite dev (proxy /api → localhost:8080)

# Racine (bun workspaces, sans Turbo) : tâches sur tous les workspaces
bun run typecheck                             # = bun run --filter='*' typecheck
bun run build                                 # = bun run --filter='*' build

# Mobile · apps/mobile
cd apps/mobile && bun start                   # Expo

# Client API typé (depuis l'OpenAPI · API lancée sur :8080)
bun api:types                                 # régénère packages/api-client/src/types.gen.ts
```

## Variables d'environnement

```env
# API (apps/api) · en dev, les défauts sont dans appsettings.json (DB sur :5438)
ConnectionStrings__Default=Host=localhost;Port=5438;Database=dorloter;Username=dorloter;Password=dorloter;Search Path=dorloter_api,public
Dorloter__Security__Jwt__Secret=...            # >= 32 octets (openssl rand -base64 48)
Dorloter__Security__Jwt__Issuer=dorloter-api
Dorloter__Security__CorsAllowedOrigins=http://localhost:5173
# Optionnels : ConnectionStrings__Migrations (rôle DDL), Dorloter__Database__AutoMigrate=false

# Email transactionnel (API) · prod · vide = désactivé (loggé en dev)
Dorloter__Email__Host=smtp-relay.brevo.com      # Brevo (français). User/Password = login + clé SMTP Brevo
Dorloter__Email__FromEmail=no-reply@dorloter.fr
# (compose prod : variables EMAIL_SMTP_HOST/PORT/USER/PASSWORD + EMAIL_FROM/EMAIL_FROM_NAME)

# Fronts (apps/web public + apps/pro espace pro + apps/mobile)
VITE_API_PROXY=http://localhost:8080            # apps/web & apps/pro · cible du proxy /api en dev
VITE_MAP_STYLE=...                              # style MapLibre (ou OpenFreeMap sans clé)
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1   # apps/mobile
```

> **À reloger** (services portés par l'ancien front Next, retiré · PAS encore couverts par l'API) : uploads d'images (S3/MinIO), gifs, Web Push (VAPID), emails transactionnels (Resend/Brevo). L'auth, elle, est passée en JWT côté API.

## Roadmap MVP

### Phase 1 · Fondations + adoption (5-6 semaines)
- [ ] Setup projet (Next.js 16, Drizzle, Docker Compose, CI)
- [ ] Auth (Better Auth : inscription, connexion, rôles user/shelter_admin)
- [ ] Proxy Next.js 16 (protection routes /app et /shelter)
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
- L'app est destinée au grand public (adoptants, propriétaires d) : l'UX doit être simple, chaleureuse, et mobile-first.
- L'espace refuge est un back-office secondaire : fonctionnel mais pas besoin d'être aussi léché que la partie publique.
- PostGIS est essentiel pour le matching géographique · ne pas proposer d'alternative NoSQL ou de calcul géo côté client.
- Le projet vise la souveraineté numérique européenne : pas d'AWS, pas de services Google/Microsoft en infra. Hetzner, Scaleway, OVH uniquement.
- Les pages publiques (catalogue adoption, signalements) doivent être accessibles sans compte. L'auth est requise uniquement pour : signaler, candidater, gérer un refuge, favoris.
- Le matching perdu/trouvé est le différenciateur technique du projet. L'algo doit être simple mais efficace, et les résultats affichés clairement avec le score et la distance.
- Toujours proposer le code en français pour les commentaires et messages utilisateur, en anglais pour le code technique (noms de variables, fonctions, etc.).
- L'app doit donner envie d'adopter : belles photos d&apos;animaux, fiches détaillées, ton bienveillant. Ce n&apos;est pas un outil admin, c&apos;est une vitrine pour aider à trouver des foyers.
