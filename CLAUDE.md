# CLAUDE.md · Dorloter

## Identité du projet

Dorloter est une plateforme web française d'adoption et de retrouvailles d'animaux domestiques. MVP centré sur **chat et chien** ; extensible aux NAC (lapin, rongeur, reptile…) sans refonte. Trois fonctions :

1. **Adoption** · vitrine des refuges et associations, profils d'animaux à adopter (photos, caractère, besoins médicaux, compatibilités). Matching adoptant/animal en swipe ou en liste filtrée, formulaire de candidature en ligne, suivi du processus.

2. **Perdus / Trouvés** · réseau de signalement géolocalisé. Les particuliers signalent un animal perdu ou trouvé, le système rapproche automatiquement les signalements par localisation, espèce, description physique et date. Notifications aux utilisateurs proches.

3. **Pensions** · annuaire des pensions professionnelles agréées (chatteries, chenils). **Pros uniquement** · SIRET et agrément préfecture vérifiés manuellement par l'équipe Dorloter avant publication. Pas de garde entre particuliers, pas de booking intégré en MVP · contact téléphone/email direct.

Domaine : `dorloter.fr`. Projet solo, développeur fullstack freelance basé en France. Priorité MVP : un prototype fonctionnel, pas une architecture parfaite.

## Stack technique

- **Framework** : Next.js 16 (App Router, Turbopack par défaut)
- **Langage** : TypeScript (strict mode)
- **ORM** : Drizzle ORM v1 beta (PostgreSQL + PostGIS) + drizzle-kit
- **Base de données** : PostgreSQL 16 + extension PostGIS
- **Auth** : Better Auth (successeur officiel de Auth.js/NextAuth, sessions en base, compatible Next.js 16 proxy)
- **UI** : Tailwind CSS v4 (config CSS-first via `@theme`, moteur Rust/Lightning CSS) + shadcn/ui
- **Cartographie** : MapLibre GL JS via react-map-gl
- **Upload images** : S3-compatible (MinIO en dev, Scaleway Object Storage en prod)
- **Validation** : Zod v3.25+ (intégré à Drizzle via drizzle-orm/zod)
- **Notifications** : Web Push API (service worker) + email via Resend ou Brevo
- **Tests** : Vitest (unit) + Playwright (e2e)
- **Infra** : Docker Compose (dev), VPS Hetzner ou Scaleway (prod)
- **CI** : GitHub Actions

## Architecture du projet

Organisation modulaire (monolithe à bounded contexts). Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour la philosophie complète, les règles d'import et le graphe de dépendances.

```
src/
├── app/                          # Next.js routes · orchestration pure
│   ├── (public)/                 # Pages sans auth (adopter, perdus-trouves, refuges)
│   ├── (app)/                    # Pages avec auth user (dashboard, candidater, signaler)
│   ├── (shelter)/                # Pages refuge admin (shelter-animaux, candidatures, stats)
│   ├── (admin)/                  # Pages plateforme admin (modération, users)
│   ├── (auth)/                   # Login / register / password flows
│   ├── api/                      # Routes API (cron, upload, auth handler, SSE messages)
│   ├── layout.tsx                # Root layout + metadata Dorloter
│   ├── manifest.ts               # PWA manifest
│   └── instrumentation.ts        # Next.js register() · bootstrap listeners event-bus
│
├── domains/                      # Bounded contexts métier
│   ├── adoption/                 # pets, applications, favorites, testimonials
│   ├── lost-found/               # reports, matching, résolution
│   ├── shelters/                 # refuges, follows, invitations
│   ├── pensions/                 # pensions pro agréées (SIRET + agrément)
│   ├── identity/                 # users, sessions, profil, admin users
│   ├── messaging/                # conversations, messages, bus SSE
│   ├── moderation/               # content reports, vérif refuges
│   ├── notifications/            # emit + listeners cross-domain
│   └── gamification/             # crédits résolution, badges
│   # chaque domaine = schema.ts + actions/ + queries/ + components/
│   # + public.ts (+ public.client.ts si besoin) + events.ts + listeners.ts
│
├── infrastructure/               # Plomberie · zéro métier
│   ├── db/                       # Clients Drizzle (app + admin), enums partagés
│   ├── auth/                     # Better Auth + session helpers
│   ├── storage/                  # S3 client
│   ├── email/                    # Resend wrapper + templates
│   ├── push/                     # Web Push VAPID
│   ├── event-bus/                # Pub/sub in-process typé
│   ├── logger/                   # JSON structured
│   ├── rate-limit/               # In-memory rate limiting
│   ├── cron/                     # Auth pour routes cron
│   └── nsfw/                     # Classification image safety
│
├── shared/                       # Primitives zéro métier
│   ├── ui/                       # Composants shadcn/ui
│   └── utils/                    # cn, geo, cities, map, placeholder-images
│
├── server/db/                    # Barrel global du schéma (re-export depuis domains/*/schema)
│   ├── schema.ts                 # Re-exports pour drizzle-kit (vue unique)
│   ├── relations.ts              # Drizzle relations
│   └── migrations/               # Migrations Drizzle-kit
│
├── components/                   # Composants transversaux
│   ├── layout/                   # navbar, footer, page-container, bottom-nav
│   ├── map/                      # location-picker, location-view (cross-domain)
│   ├── pwa/                      # service-worker-register, install-prompt
│   └── shared/                   # share-link-button (générique)
│
├── hooks/                        # Hooks React cross-domain
└── types/                        # Types TS partagés (inférés Drizzle + ActionResponse)
```

**Règles de frontière** (appliquées par dependency-cruiser + CI · voir `.dependency-cruiser.cjs`) :
- `shared/` n'importe rien d'`infrastructure/`, `domains/`, `app/`
- `infrastructure/` n'importe rien de `domains/` ou `app/`
- `domains/X` ne peut importer d'un autre domaine que via `public.ts`, `public.client.ts`, `events.ts`, `schema.ts`
- Un client component qui appelle un server action d'un autre domaine passe par `@<domain>/public.client` (séparation server/client-bundle, cf. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))

**Path aliases** : `@shared/*`, `@infra/*`, `@adoption/*`, `@shelters/*`, `@pensions/*`, `@lost-found/*`, `@messaging/*`, `@moderation/*`, `@notifications/*`, `@identity/*`, `@gamification/*`.

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

**notifications** · notifications persistées
- `id` : UUID (pk)
- `user_id` : UUID (fk → users), not null
- `type` : enum('match_found', 'application_update', 'new_cat_nearby', 'report_nearby')
- `title` : varchar(255)
- `body` : text
- `data` : jsonb · payload (lien, IDs concernés)
- `is_read` : boolean, default false
- `created_at` : timestamp

### Tables auth (gérées par Better Auth)

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

Le matching dans `server/queries/matching.ts` calcule un score (0-100) entre un signalement "perdu" et les signalements "trouvé" actifs, basé sur :

- **Distance géographique** (40 pts max) : ST_Distance entre les deux points. < 1 km = 40 pts, 1-5 km = 30 pts, 5-15 km = 20 pts, 15-30 km = 10 pts, > 30 km = 0 pts.
- **Couleur du pelage** (25 pts max) : correspondance exacte = 25 pts, partielle (ex. "noir et blanc" vs "noir") = 15 pts.
- **Race** (15 pts max) : correspondance exacte = 15 pts. "Inconnu" des deux côtés = 5 pts (neutre).
- **Sexe** (10 pts max) : correspondance = 10 pts. "Inconnu" = 5 pts.
- **Fenêtre temporelle** (10 pts max) : date trouvé >= date perdu et écart < 7 jours = 10 pts, < 14 jours = 7 pts, < 30 jours = 3 pts.

Seuil d'affichage : score >= 40. Les matches sont recalculés à chaque nouveau signalement et stockés dans `report_matches`.

## Conventions de code

### Générales
- TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- ESLint + Prettier, config Next.js par défaut étendue
- Imports absolus via `@/` mappé sur `src/`
- Nommage fichiers : kebab-case (`pet-card.tsx`, pas `CatCard.tsx`)
- Nommage composants : PascalCase à l'export
- Un composant par fichier

### Typographie (règle absolue)
- **Jamais de cadratin `—` (U+2014) ni de demi-cadratin `–` (U+2013)** dans ce projet, ni dans le code, ni dans le texte visible utilisateur (UI, metadata, OG, emails, manifest, toasts, messages d'erreur exposés), ni dans la documentation interne (CLAUDE.md, README, ROADMAP, JSDoc, commentaires).
- Remplacement par défaut : point médian `·` (U+00B7), qui est déjà la convention du template de titre `%s · Dorloter`.
- Selon le contexte, préférer `:` (définition), `,` (incise courte), `.` (deux phrases) plutôt que `·` si la lisibilité y gagne.
- Exception unique : placeholders typographiques "donnée absente" dans des tableaux/listes. Préférer chaîne vide ou `—` standalone uniquement si aucun autre signe ne convient (et demander à l'utilisateur avant d'introduire un cadratin).

### Server Actions
- Toujours valider les inputs avec Zod (via `drizzle-orm/zod` pour les schémas dérivés du schema DB) avant toute opération
- Retourner un objet `{ success: boolean, data?: T, error?: string }`
- Ne jamais exposer d'erreurs techniques au client
- Toujours vérifier la session Better Auth et le rôle en début d'action
- Utiliser `revalidatePath` après mutation
- Les actions qui modifient des données refuge vérifient que l'utilisateur est bien `shelter_admin` du refuge concerné

### Requêtes base de données
- Les requêtes SELECT vont dans `server/queries/`, les mutations dans `server/actions/`
- Utiliser les requêtes préparées Drizzle pour les requêtes fréquentes
- Requêtes PostGIS : toujours passer par les helpers dans `lib/geo.ts`
- Ne jamais faire de requête DB dans un composant client
- Pagination obligatoire sur les listings (pets, reports) : cursor-based de préférence

### Composants
- Server Components par défaut, `"use client"` uniquement quand nécessaire (interactivité, hooks)
- Props typées avec interface dédiée, pas de `any`
- Les formulaires utilisent `useActionState` (React 19) + Server Actions
- Composants de formulaire dans le même dossier que leur domaine (`components/adoption/pet-form.tsx`)
- Les cartes (pet-card, report-card) doivent être optimisées : `next/image` pour les photos, lazy loading

### Style
- Tailwind CSS v4 uniquement : configuration via `@theme` dans le CSS (pas de `tailwind.config.js`)
- Mobile-first obligatoire : le catalogue adoption et les signalements seront principalement consultés sur mobile
- Composants shadcn/ui comme base, customisés via Tailwind
- Palette : tons chaleureux (ambre, terre, crème) avec accent teal pour les actions · l'app doit donner envie d'adopter
- Dark mode supporté via Tailwind `dark:`
- Plugin Vite `@tailwindcss/vite` pour l'intégration Next.js 16 + Turbopack

### Cartographie
- MapLibre GL JS via `react-map-gl` (wrapper React)
- Tuiles : OpenFreeMap ou Protomaps (gratuit, open-source)
- GeoJSON pour les données signalements et refuges
- Cluster automatique quand zoom < 12
- Popup au clic sur marqueur, pas au survol (mobile-friendly)
- `location-picker.tsx` : composant réutilisable pour sélectionner un point sur la carte (formulaires signalement, profil)

### Notifications
- Web Push via l'API Push du navigateur + service worker
- Fallback email (Resend ou Brevo) si push non supporté
- Déclencheurs : nouveau signalement "trouvé" dans le rayon d'un signalement "perdu" actif, mise à jour candidature, nouvel animal dans un refuge suivi
- Notifications persistées en base (table `notifications`) pour le centre de notifications in-app

## Commandes

```bash
# Dev
bun dev                     # Next.js dev server (Turbopack)
bun db:push                 # Push schema Drizzle → PostgreSQL
bun db:generate             # Générer migration
bun db:migrate              # Appliquer migrations
bun db:studio               # Drizzle Studio (UI admin DB)
bun db:seed                 # Seed données de test (refuges, animaux, signalements)
docker compose up -d        # PostgreSQL + PostGIS + MinIO

# Tests
bun test                    # Vitest unit tests
bun test:e2e                # Playwright e2e

# Build
bun run build               # Build production
bun lint                    # ESLint
bun typecheck               # tsc --noEmit
```

## Variables d'environnement

```env
DATABASE_URL=postgresql://dorloter:dorloter@localhost:5432/dorloter
BETTER_AUTH_SECRET=... # généré (openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=dorloter-photos
S3_PUBLIC_URL=http://localhost:9000/dorloter-photos
NEXT_PUBLIC_MAPTILER_KEY=... # ou autre provider de tuiles
VAPID_PUBLIC_KEY=... # Web Push (généré avec web-push generate-vapid-keys)
VAPID_PRIVATE_KEY=...
RESEND_API_KEY=... # ou Brevo, pour les emails transactionnels
```

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
