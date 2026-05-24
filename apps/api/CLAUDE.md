# CLAUDE.md · apps/api

> Backend de Dorloter. Ce fichier complète le [CLAUDE.md racine](../../CLAUDE.md),
> qui porte l'identité du produit, les conventions transverses et la règle
> typographique. Tout ce qui suit ne concerne que l'API.

## Stack

- **Framework** : NestJS 11 (Express) · monolithe modulaire (1 dossier par domaine dans `src/modules/`)
- **Langage** : TypeScript strict (`noUncheckedIndexedAccess`), CommonJS, cible ES2023
- **Accès DB** : Kysely + `pg` (SQL-first, requêtes typées depuis `infra/database/schema.ts` · pas d'ORM, colle au schéma existant). Parseurs pg ajustés : `bigint`/`numeric` en nombres, `date` en `yyyy-mm-dd`
- **PostGIS** : SQL natif via le template `sql` de Kysely (`ST_DWithin`/`ST_Distance` sur `::geography` ; géo écrite via `ST_SetSRID(ST_MakePoint(lng,lat),4326)`, lue via `ST_Y`/`ST_X`)
- **Auth** : JWT HS256 (`jsonwebtoken`) · scrypt Better Auth reproduit au bit près (`node:crypto` `scryptSync` + normalisation NFKC, test d'interop) · garde `@Auth()` + décorateur `@CurrentUser()`
- **Migrations schéma** : migrateur maison au démarrage (`.sql` de `migrations/`, copiés dans `dist/migrations` au build · compat `flyway_schema_history`, avec connexion DDL dédiée optionnelle `ConnectionStrings__Migrations`)
- **Validation** : `class-validator` sur les DTOs via le `ValidationPipe` global
- **Stockage objet** : `infra/storage` · présignature S3 SigV4 écrite à la main (pas de SDK AWS), MinIO en dev
- **Email** : `infra/email` (transport SMTP nodemailer ; no-op loggé si `EMAIL_SMTP_HOST` est vide)
- **OpenAPI** : document servi sur `/api/v1/openapi` (partiel · annotation exhaustive = dernier chantier ; le client typé existant reste valide car iso-contrat)
- **Tests** : `bun test src` (interop scrypt, scoring matching, complétude de l'effacement RGPD) ; flux exercés end-to-end contre PostGIS

## Arborescence

```
src/
├── modules/     # Bounded contexts : identity, adoption, shelters, lostfound,
│                #   pensions, notifications, gamification, moderation,
│                #   messaging, uploads
│                # (par module : *.module.ts + *.service.ts + *.controller.ts)
│                # identity porte aussi privacy.* (export/effacement RGPD)
│                #   et retention.* (purge des durées de conservation)
├── shared/      # app-error (AppError/ErrorCode), api-response (ok/page),
│                #   cursor, db-enum (validation filtres/corps), validation, format
├── infra/       # database (Kysely + schema.ts + migrator compat Flyway),
│                #   security (jwt, scrypt, Auth/CurrentUser), email, storage (S3),
│                #   web (health, openapi)
└── config.ts · config.module.ts · app.module.ts · main.ts

migrations/      # .sql (schéma dorloter_api), appliqués au démarrage, copiés dans dist/
```

**Frontières inter-modules** : un module n'accède à un autre QUE via les providers publics que celui-ci exporte (ex. `ShelterDirectory`, `ShelterMembershipService`, `UserDirectory`, `NotificationsService`), jamais via ses structures internes. Ces providers sont listés dans le `exports` du module Nest correspondant. Seule exception assumée : `identity/retention.service.ts`, qui purge des tables d'autres modules (l'expiration est une propriété de la donnée, pas du domaine qui la produit).

**Contrat d'API stable** : enveloppe `{ data }` (objet) / `{ data, pagination }` (liste paginée cursor) / `{ error: { code, message, details? } }`. Codes d'erreur stables (`ErrorCode`), routes sous `/api/v1`. Ce contrat est partagé par les 3 clients (web, pro, mobile) · le casser oblige à régénérer `packages/api-client`.

## Conventions
- Un module = `<nom>.module.ts` + `<nom>.service.ts` (logique métier + SQL) + `<nom>.controller.ts` (routes, DTOs, mapping de sortie). Les features de back-office volumineuses ont leur propre paire (ex. `adoption-contracts.controller.ts`) ; un contrôleur court peut porter son SQL directement.
- Toujours renvoyer l'enveloppe via les helpers `ok(...)` / `page(..., nextCursor)` (pas d'intercepteur global : les 204 restent sans corps). Erreurs métier via `AppError` (`notFoundId`/`forbidden`/`conflict`/...) · jamais d'erreur technique exposée (le filtre global loggue et renvoie un 500 générique).
- Auth : protection PAR HANDLER via `@Auth()` (absent = endpoint public), identité via `@CurrentUser()`. `current.requireRole('platform_admin')` pour le réservé plateforme.
- Autorisation refuge par PERMISSION via `membership.requireAccess(userId, 'pets:write')` (PAS par rôle JWT : un membre invité a `role=user` mais des permissions d'équipe).
- Validation : DTOs `class-validator` avec messages français explicites (un message par contrainte). Enum invalide dans le CORPS -> `VALIDATION_FAILED` (`bodyEnumReq`/`bodyEnumOpt` ou `@IsIn`) ; en FILTRE de query -> `INVALID_PARAM` (`validateFilter`) ; validé dans un service -> `UNPROCESSABLE` (`ensureValue`).
- DB : Kysely (pas d'ORM), requêtes explicites sur le schéma `dorloter_api` typé dans `infra/database/schema.ts`. Enums métier lus/écrits comme `string` (valeur DB française réémise telle quelle) ; décimaux `numeric` castés `::float8` ; colonnes `jsonb` en valeur JSON.
- PostGIS : écrire les points via `` sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` ``, lire via `ST_Y`/`ST_X` ; matching/proximité en SQL natif avec cast `::geography` (mètres géodésiques).
- Pagination obligatoire sur les listings : cursor keyset (`created_at DESC, id DESC` via `shared/cursor`).
- DTOs de sortie en camelCase (mapping explicite depuis les colonnes snake_case) ; dates `timestamptz` en RFC 3339, `date` en `yyyy-mm-dd`.

## Commandes

```bash
bun dev            # nest start --watch (migre le schéma au démarrage)
bun run build      # nest build -> dist/ (+ copie des migrations)
bun start          # node dist/main.js (mode prod local)
bun run typecheck  # tsc --noEmit
bun test src       # tests unitaires

# Image de prod (contexte autonome = apps/api, migrations copiées dans l'image) :
# docker build -t dorloter-api apps/api
# ou : docker compose --profile api up --build
```

La base et MinIO se lancent depuis la racine : `docker compose up -d`, puis `bun db:seed`.

## Variables d'environnement

```env
# En dev, les défauts sont dans le code (config.ts, DB sur :5438).
ConnectionStrings__Default=Host=localhost;Port=5438;Database=dorloter;Username=dorloter;Password=dorloter;Search Path=dorloter_api,public
Dorloter__Security__Jwt__Secret=...            # >= 32 octets (openssl rand -base64 48)
Dorloter__Security__Jwt__Issuer=dorloter-api
Dorloter__Security__CorsAllowedOrigins=http://localhost:5173
# Optionnels : ConnectionStrings__Migrations (rôle DDL dédié), Dorloter__Database__AutoMigrate=false, BIND_ADDR

# Email transactionnel (Brevo recommandé, français). EMAIL_SMTP_HOST vide =
# envoi désactivé : les emails sont seulement loggés, et la suppression des
# comptes inactifs ne s'engage pas (elle exige une relance effectivement remise).
EMAIL_SMTP_HOST=smtp-relay.brevo.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=...
EMAIL_SMTP_PASSWORD=...
EMAIL_FROM=no-reply@dorloter.fr
EMAIL_FROM_NAME=Dorloter
Dorloter__PublicWebUrl=https://dorloter.fr    # liens des emails

# Stockage objet. S3_ENDPOINT doit être l'URL PUBLIQUE : elle entre dans la
# signature des URL d'upload, et c'est l'hôte que le client contactera.
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=dorloter-photos
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

## RGPD

L'API porte l'essentiel de la conformité : export et effacement (`identity/privacy.service.ts`), purge des durées de conservation (`identity/retention.service.ts`). Les durées codées ici sont la traduction littérale de la politique publiée dans `apps/web` · toute modification doit être répercutée des deux côtés. Détail complet : **[docs/RGPD.md](../../docs/RGPD.md)**.

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
