# CLAUDE.md — Miaou

## Identité du projet

Miaou est une plateforme web française dédiée aux chats, réunissant deux fonctions complémentaires :

1. **Adoption** — une vitrine moderne pour les refuges et associations, permettant de publier des profils de chats à adopter avec photos, caractère, besoins médicaux, et compatibilités. Système de matching adoptant/chat inspiré de Tinder (swipe ou filtres avancés), formulaire de candidature en ligne, et suivi du processus d'adoption.

2. **Perdus / Trouvés** — un réseau de signalement géolocalisé. Les particuliers signalent un chat perdu ou trouvé, et le système rapproche automatiquement les signalements par localisation, description physique (couleur, race, signes distinctifs) et date. Notifications aux utilisateurs proches d'un signalement.

L'objectif est de devenir le réflexe unique en France quand on cherche à adopter un chat ou qu'on en a perdu/trouvé un. Le projet est développé en solo par un développeur fullstack freelance basé en France. La priorité est de sortir un prototype fonctionnel rapidement.

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

```
miaou/
├── CLAUDE.md
├── docker-compose.yml            # PostgreSQL + PostGIS + MinIO
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── .env.local.example
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout, providers, fonts
│   │   ├── page.tsx               # Landing page publique
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx         # Layout auth (centré, minimal)
│   │   │
│   │   ├── (public)/              # Pages accessibles sans auth
│   │   │   ├── adopter/
│   │   │   │   ├── page.tsx       # Catalogue chats à adopter (filtres, grille, carte)
│   │   │   │   └── [id]/page.tsx  # Fiche détaillée chat + bouton candidature
│   │   │   ├── perdus-trouves/
│   │   │   │   ├── page.tsx       # Carte des signalements + liste
│   │   │   │   └── [id]/page.tsx  # Détail signalement + correspondances
│   │   │   └── refuges/
│   │   │       ├── page.tsx       # Annuaire des refuges partenaires
│   │   │       └── [id]/page.tsx  # Page refuge + ses chats
│   │   │
│   │   ├── (app)/                 # Pages nécessitant auth
│   │   │   ├── layout.tsx         # Layout app (navbar, sidebar mobile)
│   │   │   ├── dashboard/page.tsx # Accueil utilisateur (mes favoris, mes signalements)
│   │   │   ├── signaler/
│   │   │   │   └── page.tsx       # Formulaire signalement perdu/trouvé
│   │   │   ├── candidatures/
│   │   │   │   └── page.tsx       # Mes candidatures d'adoption
│   │   │   ├── mes-signalements/
│   │   │   │   └── page.tsx       # Mes signalements actifs
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx       # Centre de notifications
│   │   │   └── profil/
│   │   │       └── page.tsx       # Mon profil, préférences, localisation
│   │   │
│   │   ├── (shelter)/             # Espace refuge (auth + rôle shelter)
│   │   │   ├── layout.tsx         # Layout admin refuge
│   │   │   ├── mes-chats/
│   │   │   │   ├── page.tsx       # Gestion chats du refuge
│   │   │   │   ├── [id]/edit/page.tsx
│   │   │   │   └── new/page.tsx   # Ajouter un chat
│   │   │   ├── candidatures/
│   │   │   │   └── page.tsx       # Candidatures reçues
│   │   │   └── stats/
│   │   │       └── page.tsx       # Stats du refuge (adoptions, vues)
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...all]/route.ts    # Better Auth handler
│   │       ├── upload/
│   │       │   └── route.ts             # Upload images → S3
│   │       └── notifications/
│   │           └── subscribe/route.ts   # Web Push subscription
│   │
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts           # Connexion Drizzle
│   │   │   ├── schema.ts          # Schéma complet (tables, relations, enums)
│   │   │   └── migrations/        # Migrations Drizzle Kit
│   │   ├── actions/
│   │   │   ├── cats.ts            # Server Actions chats (CRUD refuge)
│   │   │   ├── reports.ts         # Server Actions signalements perdu/trouvé
│   │   │   ├── applications.ts    # Server Actions candidatures adoption
│   │   │   ├── favorites.ts       # Server Actions favoris utilisateur
│   │   │   └── shelters.ts        # Server Actions gestion refuge
│   │   ├── queries/
│   │   │   ├── cats.ts            # Chats à adopter (filtres, géo, pagination)
│   │   │   ├── reports.ts         # Signalements (géo, matching)
│   │   │   ├── matching.ts        # Algo correspondance perdu/trouvé
│   │   │   ├── shelters.ts        # Refuges (listing, détail)
│   │   │   └── stats.ts           # Agrégations dashboard refuge
│   │   └── auth/
│   │       ├── auth.ts            # Config Better Auth (server)
│   │       └── auth-client.ts     # Client Better Auth
│   │
│   ├── components/
│   │   ├── ui/                    # Composants shadcn/ui
│   │   ├── map/
│   │   │   ├── report-map.tsx     # Carte signalements MapLibre
│   │   │   ├── shelter-map.tsx    # Carte refuges
│   │   │   ├── location-picker.tsx # Sélecteur de position (formulaire)
│   │   │   └── map-controls.tsx
│   │   ├── cats/
│   │   │   ├── cat-card.tsx       # Card chat (grille adoption)
│   │   │   ├── cat-profile.tsx    # Profil détaillé
│   │   │   ├── cat-gallery.tsx    # Galerie photos swipeable
│   │   │   ├── cat-filters.tsx    # Filtres (race, âge, sexe, compatibilité)
│   │   │   └── cat-form.tsx       # Formulaire ajout/edit chat (refuge)
│   │   ├── reports/
│   │   │   ├── report-card.tsx    # Card signalement
│   │   │   ├── report-form.tsx    # Formulaire signalement
│   │   │   ├── report-matches.tsx # Liste correspondances trouvées
│   │   │   └── report-status-badge.tsx
│   │   ├── adoption/
│   │   │   ├── application-form.tsx    # Formulaire candidature
│   │   │   ├── application-status.tsx  # Suivi candidature
│   │   │   └── matching-score.tsx      # Score compatibilité adoptant/chat
│   │   ├── shelters/
│   │   │   ├── shelter-card.tsx
│   │   │   └── shelter-profile.tsx
│   │   ├── notifications/
│   │   │   ├── notification-bell.tsx
│   │   │   └── notification-list.tsx
│   │   └── layout/
│   │       ├── navbar.tsx
│   │       ├── footer.tsx
│   │       └── mobile-nav.tsx
│   │
│   ├── lib/
│   │   ├── validators/            # Schémas Zod
│   │   │   ├── cat.ts
│   │   │   ├── report.ts
│   │   │   ├── application.ts
│   │   │   └── shelter.ts
│   │   ├── s3.ts                  # Client S3 (upload, signed URLs, resize)
│   │   ├── geo.ts                 # Helpers PostGIS (ST_DWithin, GeoJSON, distance)
│   │   ├── matching.ts            # Algo matching perdu/trouvé (scoring)
│   │   ├── notifications.ts       # Helpers Web Push + email
│   │   └── utils.ts               # Helpers génériques
│   │
│   ├── hooks/
│   │   ├── use-geolocation.ts     # Hook géolocalisation navigateur
│   │   └── use-push-notifications.ts
│   │
│   └── types/
│       └── index.ts               # Types partagés (inférés du schema Drizzle)
│
├── public/
│   ├── sw.js                      # Service Worker (push notifications)
│   └── manifest.json              # PWA manifest
│
└── tests/
    ├── unit/
    └── e2e/
```

## Modèle de données

### Tables métier

**cats** — chats à adopter (gérés par les refuges)
- `id` : UUID (pk, gen_random_uuid)
- `shelter_id` : UUID (fk → shelters), not null
- `name` : varchar(255), not null
- `description` : text — personnalité, histoire
- `breed` : varchar(100) — race ("Européen", "Siamois", "Inconnu"...)
- `color` : varchar(100) — couleur du pelage
- `sex` : enum('male', 'femelle', 'inconnu')
- `age_category` : enum('chaton', 'jeune', 'adulte', 'senior') — tranches plutôt qu'âge exact
- `estimated_birth` : date — nullable, approximatif
- `is_sterilized` : boolean
- `is_chipped` : boolean
- `is_vaccinated` : boolean
- `fiv_felv` : enum('negatif', 'fiv_positif', 'felv_positif', 'fiv_felv_positif', 'non_teste')
- `ok_with_cats` : enum('oui', 'non', 'inconnu')
- `ok_with_dogs` : enum('oui', 'non', 'inconnu')
- `ok_with_children` : enum('oui', 'non', 'inconnu')
- `indoor_only` : boolean — chat d'intérieur uniquement
- `special_needs` : text — besoins spécifiques (régime, médicaments...)
- `status` : enum('disponible', 'reserve', 'adopte', 'retire')
- `adoption_fee` : decimal(8,2) — frais d'adoption
- `created_at`, `updated_at` : timestamp

**cat_photos** — plusieurs photos par chat (galerie)
- `id` : UUID (pk)
- `cat_id` : UUID (fk → cats)
- `url` : text, not null
- `is_primary` : boolean — photo principale affichée en card
- `order` : integer — ordre dans la galerie
- `created_at` : timestamp

**reports** — signalements perdu/trouvé
- `id` : UUID (pk)
- `user_id` : UUID (fk → users), not null
- `type` : enum('perdu', 'trouve'), not null
- `status` : enum('actif', 'resolu', 'expire')
- `cat_name` : varchar(255) — nullable (trouvé = pas de nom)
- `description` : text, not null — description physique détaillée
- `breed` : varchar(100)
- `color` : varchar(100)
- `sex` : enum('male', 'femelle', 'inconnu')
- `is_chipped` : boolean
- `chip_number` : varchar(50) — si connu
- `distinctive_signs` : text — cicatrice, oreille coupée, collier...
- `location` : geography(Point, 4326), not null — PostGIS, lieu de perte/découverte
- `address` : text — adresse lisible
- `date_event` : date, not null — date de perte ou découverte
- `contact_phone` : varchar(20)
- `contact_email` : varchar(255)
- `notes` : text
- `created_at`, `updated_at` : timestamp

**report_photos** — photos du signalement
- `id` : UUID (pk)
- `report_id` : UUID (fk → reports)
- `url` : text, not null
- `is_primary` : boolean
- `order` : integer
- `created_at` : timestamp

**report_matches** — correspondances suggérées entre perdu et trouvé
- `id` : UUID (pk)
- `lost_report_id` : UUID (fk → reports), not null — le signalement "perdu"
- `found_report_id` : UUID (fk → reports), not null — le signalement "trouvé"
- `score` : decimal(5,2) — score de similarité (0-100)
- `distance_meters` : integer — distance entre les deux points
- `status` : enum('suggere', 'confirme', 'rejete')
- `created_at` : timestamp

**applications** — candidatures d'adoption
- `id` : UUID (pk)
- `cat_id` : UUID (fk → cats), not null
- `user_id` : UUID (fk → users), not null
- `status` : enum('envoyee', 'en_cours', 'acceptee', 'refusee', 'annulee')
- `housing_type` : enum('appartement', 'maison', 'autre')
- `has_outdoor_access` : boolean
- `has_other_pets` : text — description des autres animaux
- `has_children` : boolean
- `children_ages` : text — âges des enfants
- `experience` : text — expérience avec les chats
- `motivation` : text, not null — pourquoi ce chat
- `availability` : text — disponibilité pour visite/rencontre
- `shelter_notes` : text — notes internes du refuge
- `created_at`, `updated_at` : timestamp

**favorites** — chats favoris d'un utilisateur
- `user_id` : UUID (fk → users)
- `cat_id` : UUID (fk → cats)
- `created_at` : timestamp
- PK composite : (user_id, cat_id)

**shelters** — refuges et associations partenaires
- `id` : UUID (pk)
- `name` : varchar(255), not null
- `slug` : varchar(255), unique — URL friendly
- `description` : text
- `siret` : varchar(14)
- `address` : text
- `location` : geography(Point, 4326) — PostGIS
- `phone` : varchar(20)
- `email` : varchar(255)
- `website` : text
- `logo_url` : text
- `cover_url` : text
- `is_verified` : boolean — vérifié par l'admin plateforme
- `created_at`, `updated_at` : timestamp

**notifications** — notifications persistées
- `id` : UUID (pk)
- `user_id` : UUID (fk → users), not null
- `type` : enum('match_found', 'application_update', 'new_cat_nearby', 'report_nearby')
- `title` : varchar(255)
- `body` : text
- `data` : jsonb — payload (lien, IDs concernés)
- `is_read` : boolean, default false
- `created_at` : timestamp

### Tables auth (gérées par Better Auth)

**users**
- `id` : UUID (pk)
- `email` : varchar(255), unique, not null
- `email_verified` : boolean
- `name` : varchar(255), not null
- `image` : text — avatar
- `role` : enum('user', 'shelter_admin', 'platform_admin')
- `shelter_id` : UUID (fk → shelters) — nullable, si admin refuge
- `location` : geography(Point, 4326) — localisation utilisateur (pour notifications proximité)
- `notification_radius_km` : integer, default 10 — rayon alertes perdus/trouvés
- `push_subscription` : jsonb — Web Push subscription
- `phone` : varchar(20)
- `created_at`, `updated_at` : timestamp

**sessions** — gérée automatiquement par Better Auth
- `id` : varchar(255) (pk)
- `user_id` : UUID (fk → users)
- `token` : varchar(255)
- `expires_at` : timestamp
- `ip_address` : text
- `user_agent` : text
- `created_at`, `updated_at` : timestamp

**accounts** — gérée automatiquement par Better Auth
- `id` : varchar(255) (pk)
- `user_id` : UUID (fk → users)
- `account_id` : varchar(255)
- `provider_id` : varchar(255)
- `access_token`, `refresh_token` : text
- `expires_at` : timestamp
- `password` : text

**verifications** — gérée automatiquement par Better Auth
- `id` : varchar(255) (pk)
- `identifier` : varchar(255)
- `value` : varchar(255)
- `expires_at` : timestamp
- `created_at`, `updated_at` : timestamp

### Relations clés
- Un refuge a plusieurs chats et un ou plusieurs admins (users avec role shelter_admin).
- Un chat a plusieurs photos (cat_photos) et peut recevoir plusieurs candidatures (applications).
- Un utilisateur peut avoir plusieurs signalements (reports), plusieurs candidatures, et plusieurs favoris.
- Un signalement a plusieurs photos (report_photos) et peut être mis en correspondance avec d'autres signalements (report_matches).
- Une correspondance lie toujours un signalement "perdu" à un signalement "trouvé".

### Index recommandés
- `reports.location` : index GIST (requêtes spatiales, matching)
- `shelters.location` : index GIST
- `users.location` : index GIST (notifications proximité)
- `cats.shelter_id` : index B-tree
- `cats.status` : index B-tree (filtrage sur "disponible")
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
- Nommage fichiers : kebab-case (`cat-card.tsx`, pas `CatCard.tsx`)
- Nommage composants : PascalCase à l'export
- Un composant par fichier

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
- Pagination obligatoire sur les listings (cats, reports) : cursor-based de préférence

### Composants
- Server Components par défaut, `"use client"` uniquement quand nécessaire (interactivité, hooks)
- Props typées avec interface dédiée, pas de `any`
- Les formulaires utilisent `useActionState` (React 19) + Server Actions
- Composants de formulaire dans le même dossier que leur domaine (`components/cats/cat-form.tsx`)
- Les cartes (cat-card, report-card) doivent être optimisées : `next/image` pour les photos, lazy loading

### Style
- Tailwind CSS v4 uniquement : configuration via `@theme` dans le CSS (pas de `tailwind.config.js`)
- Mobile-first obligatoire : le catalogue adoption et les signalements seront principalement consultés sur mobile
- Composants shadcn/ui comme base, customisés via Tailwind
- Palette : tons chaleureux (ambre, terre, crème) avec accent teal pour les actions — l'app doit donner envie d'adopter
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
- Déclencheurs : nouveau signalement "trouvé" dans le rayon d'un signalement "perdu" actif, mise à jour candidature, nouveau chat dans un refuge suivi
- Notifications persistées en base (table `notifications`) pour le centre de notifications in-app

## Commandes

```bash
# Dev
pnpm dev                    # Next.js dev server (Turbopack)
pnpm db:push                # Push schema Drizzle → PostgreSQL
pnpm db:generate            # Générer migration
pnpm db:migrate             # Appliquer migrations
pnpm db:studio              # Drizzle Studio (UI admin DB)
pnpm db:seed                # Seed données de test (refuges, chats, signalements)
docker compose up -d        # PostgreSQL + PostGIS + MinIO

# Tests
pnpm test                   # Vitest unit tests
pnpm test:e2e               # Playwright e2e

# Build
pnpm build                  # Build production
pnpm lint                   # ESLint
pnpm typecheck              # tsc --noEmit
```

## Variables d'environnement

```env
DATABASE_URL=postgresql://miaou:miaou@localhost:5432/miaou
BETTER_AUTH_SECRET=... # généré (openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=miaou-photos
S3_PUBLIC_URL=http://localhost:9000/miaou-photos
NEXT_PUBLIC_MAPTILER_KEY=... # ou autre provider de tuiles
VAPID_PUBLIC_KEY=... # Web Push (généré avec web-push generate-vapid-keys)
VAPID_PRIVATE_KEY=...
RESEND_API_KEY=... # ou Brevo, pour les emails transactionnels
```

## Roadmap MVP

### Phase 1 — Fondations + adoption (5-6 semaines)
- [ ] Setup projet (Next.js 16, Drizzle, Docker Compose, CI)
- [ ] Auth (Better Auth : inscription, connexion, rôles user/shelter_admin)
- [ ] Proxy Next.js 16 (protection routes /app et /shelter)
- [ ] CRUD refuges + page publique refuge
- [ ] CRUD chats à adopter (formulaire multi-photos, tous les champs)
- [ ] Catalogue public : grille de cards, filtres (race, âge, sexe, compatibilité), pagination
- [ ] Fiche détaillée chat avec galerie photos
- [ ] Système de favoris (coeur sur les cards)
- [ ] Upload images vers S3 + optimisation (sharp ou next/image)

### Phase 2 — Perdus/trouvés + matching (5-6 semaines)
- [ ] Formulaire signalement perdu/trouvé (localisation carte, photos, description)
- [ ] Carte interactive des signalements (MapLibre)
- [ ] Algo de matching automatique (score basé distance + description)
- [ ] Page correspondances pour un signalement
- [ ] Composant location-picker réutilisable
- [ ] Gestion des statuts (actif → résolu)
- [ ] Page "mes signalements"

### Phase 3 — Candidatures + notifications (4-5 semaines)
- [ ] Formulaire de candidature adoption
- [ ] Espace refuge : réception et gestion des candidatures
- [ ] Notifications Web Push (nouveau match, mise à jour candidature)
- [ ] Notifications email (fallback)
- [ ] Centre de notifications in-app
- [ ] Dashboard stats refuge (nombre de vues, candidatures, adoptions)

### Phase 4 — Polish + lancement (3-4 semaines)
- [ ] Landing page publique attractive
- [ ] SEO (metadata, sitemap, structured data pour les chats)
- [ ] PWA (manifest, service worker, install prompt)
- [ ] Responsive final pass sur tous les écrans
- [ ] Seed script avec données réalistes pour démo
- [ ] Déploiement prod (Hetzner/Scaleway)

## Notes importantes pour Claude

- Ce projet est un MVP solo — privilégier la simplicité et la vitesse de livraison à l'architecture parfaite.
- Ne pas sur-engineer : pas de microservices, pas de message queue, pas de cache Redis pour le MVP.
- L'app est destinée au grand public (adoptants, propriétaires de chats perdus) : l'UX doit être simple, chaleureuse, et mobile-first.
- L'espace refuge est un back-office secondaire : fonctionnel mais pas besoin d'être aussi léché que la partie publique.
- PostGIS est essentiel pour le matching géographique — ne pas proposer d'alternative NoSQL ou de calcul géo côté client.
- Le projet vise la souveraineté numérique européenne : pas d'AWS, pas de services Google/Microsoft en infra. Hetzner, Scaleway, OVH uniquement.
- Les pages publiques (catalogue adoption, signalements) doivent être accessibles sans compte. L'auth est requise uniquement pour : signaler, candidater, gérer un refuge, favoris.
- Le matching perdu/trouvé est le différenciateur technique du projet. L'algo doit être simple mais efficace, et les résultats affichés clairement avec le score et la distance.
- Toujours proposer le code en français pour les commentaires et messages utilisateur, en anglais pour le code technique (noms de variables, fonctions, etc.).
- L'app doit donner envie d'adopter : belles photos de chats, fiches détaillées, ton bienveillant. Ce n'est pas un outil admin, c'est une vitrine pour sauver des chats.
