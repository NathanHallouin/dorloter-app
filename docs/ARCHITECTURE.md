# Architecture Dorloter · proposition d'évolution (contexte historique)

> **Contexte** : ce document de réflexion a été écrit alors que Dorloter était
> un monolithe **Next.js / Drizzle / Better Auth** (Server Actions). Ce stack a
> depuis été retiré : l'architecture cible décrite ici (monolithe modulaire à
> bounded contexts, frontières par contrats publics, communication inter-modules
> contrôlée) a en pratique été **réalisée dans l'API** (`apps/api`,
> le service API), avec un `<Module>Module.cs` par bounded context et une API
> publique de module exposée au niveau du package racine. Les principes de ce
> document restent pertinents ; en revanche les détails d'implémentation
> (Server Actions, Drizzle, `next/cache`, dependency-cruiser TS, structure
> `src/domains/*`) reflètent l'ancien front et ne décrivent plus le code actuel.
> Source de vérité du stack : **[CLAUDE.md](../CLAUDE.md)**.

Document de réflexion sur l'évolution de l'architecture logicielle de Dorloter, du **MVP monolithique** (à l'époque Next.js) vers une **structure modulaire professionnelle** qui tienne la route à mesure que les domaines s'ajoutent (TNR, vet network, encadrement adoption…) sans tomber dans la sur-ingénierie.

**Principe directeur** : le bon niveau d'ambition pour un projet solo-dev qui ambitionne de grossir, c'est le **monolithe modulaire** avec des frontières claires et des règles de dépendances strictes, **pas** les microservices (qui seraient un désastre opérationnel à ton échelle).

---

## 1. Où on en est — diagnostic de l'existant

### Ce qui marche

L'organisation actuelle suit les conventions Next.js et reste lisible. Les séparations `server/actions/`, `server/queries/`, `components/` sont saines pour un MVP.

### Ce qui commence à fissurer

En 9 domaines déjà livrés (adoption, lost/found, shelters, moderation, messaging, notifications, gamification, testimonials, TNR en projet), on voit apparaître :

1. **Collision de préoccupations dans `server/actions/`** : un dossier plat avec `cats.ts`, `reports.ts`, `applications.ts`, `moderation.ts`, `messaging.ts`, `shelter-follow.ts`, `shelter-invitations.ts`, `shelters.ts`, `testimonials.ts`, `report-import.ts`, `report-resolve.ts`, `favorites.ts`, `profile.ts`, `notifications.ts`… 14 fichiers. Pas de regroupement, pas d'ownership.

2. **`schema.ts` mono-fichier** : ~650 lignes, **17 tables**. Chaque nouveau domaine (TNR = 5-8 tables) aggrave. Fusion conflicts et navigabilité en souffrent.

3. **Appels cross-domain en dur** :
   - `cats.ts` importe et appelle directement `emitNotification` pour prévenir les followers du refuge
   - `reports.ts` appelle `grantResolutionCredits` (gamification) quand un match est confirmé
   - `applications.ts` appelle `emitNotification` + `sendEmail`

   Pas forcément mauvais mais couple fort : impossible de travailler sur le module adoption sans taper dans le module notifications.

4. **Pas de frontières vérifiables** : rien n'empêche qu'un composant `<CatCard>` importe directement `db` et fasse une requête. Le code marche, mais l'accumulation de ces petits raccourcis rend l'évolution douloureuse à 3000+ lignes.

5. **Tests difficiles** : pas de surface d'isolation claire par domaine. Tester `adoption` signifie gérer la base de données complète + les dépendances croisées.

6. **Scaling bloqué** : impossible aujourd'hui d'envoyer le module TNR sur un serveur différent, ou de lui donner un déploiement indépendant (si l'équipe TNR itère vite et ne veut pas attendre le release calendrier d'adoption).

### Ce qu'on **refuse** de considérer

- **Microservices** : catastrophique pour un solo dev. 10× la complexité opérationnelle pour 0 bénéfice tant que tu n'as pas 5+ ingénieurs.
- **Full DDD cathédrale** : value objects, aggregate roots, specification pattern… trop d'overhead pour le gain à ce stade.
- **Rewrite complet** : on migre de façon **incrémentale**, jamais de big bang.

---

## 2. Cible — monolithe modulaire avec bounded contexts

### Bounded contexts identifiés pour Dorloter

Chaque encadré = un module autonome avec sa propre logique métier, ses propres tables, ses propres API internes. Les dépendances entre modules passent par des **contrats publics explicites**.

| Module | Responsabilité | Tables principales | Statut |
|---|---|---|---|
| **identity** | Users, auth, sessions, rôles, profil | `users`, `sessions`, `accounts`, `verifications` | existant |
| **shelters** | Refuges, admins, invitations, vérification | `shelters`, `shelter_invitations`, `shelter_follows` | existant |
| **adoption** | Chats, candidatures, témoignages | `cats`, `cat_photos`, `applications`, `favorites`, `testimonials` | existant |
| **lost-found** | Signalements perdu/trouvé, matching | `reports`, `report_photos`, `report_matches` | existant |
| **messaging** | Conversations, messages, réactions | `conversations`, `messages`, `message_reactions` | existant |
| **moderation** | Signalements de contenu, file admin | `content_reports` | existant |
| **notifications** | Fanout in-app/push/email, préférences user | `notifications` | existant |
| **gamification** | Crédits résolution, badges | `resolution_credits` | existant |
| **tnr** | Colonies, stérilisations, bénévoles, zones | `colonies`, `cat_colony_members`, `sterilization_events`, `volunteers`… | **futur** |
| **vet-network** | Vétérinaires partenaires, rendez-vous | `vet_profiles`, `vet_appointments`… | **futur** |
| **analytics** | Agrégations, export open data | vues SQL, pas de tables métier | **futur** |
| **billing** | Dons, parrainages, dépôts | `subscriptions`, `donations`, `deposits`… | **futur** |
| **community** | Forum, posts, commentaires experts | `threads`, `posts`, `expert_badges`… | **futur** |

### Cross-cutting concerns (pas des domaines)

Ces éléments ne portent pas de logique métier, ils servent de **plomberie** :

- **Database** : Drizzle client, rôles PG, migrations
- **Auth infrastructure** : Better Auth config, session helpers (séparé de `identity` qui est le domaine métier)
- **Storage** : client S3/MinIO
- **Email transport** : Resend wrapper (templates = domaine notifications)
- **Push infrastructure** : Web Push VAPID
- **Rate limiting** : in-memory / Redis plus tard
- **Event bus** : in-process / Redis pub/sub plus tard
- **Logging** : JSON structured
- **Cron authentication** : helper partagé

### Shared kernel (primitives)

- **UI components** (Button, Card, PageContainer, etc.) — pas de logique métier
- **Utils** (`cn`, date formatting, slugify, geo helpers PostGIS)
- **Validation** : Zod schemas partagés
- **Types** : primitives cross-domain (ActionResponse<T>, etc.)

---

## 3. Structure de dossiers proposée

```
src/
├── shared/                         # primitives, zéro métier
│   ├── ui/                         # Button, Card, PageContainer, Badge...
│   ├── utils/                      # cn, date-fns wrappers, geo.ts, slugify
│   ├── validation/                 # schemas Zod partagés
│   ├── types/                      # ActionResponse, etc.
│   └── index.ts                    # re-exports stables
│
├── infrastructure/                 # plomberie, zéro métier
│   ├── db/
│   │   ├── client.ts               # db + adminDb (singletons)
│   │   ├── types.ts                # helpers Drizzle
│   │   └── migrations/             # .sql
│   ├── auth/
│   │   ├── config.ts               # Better Auth init
│   │   ├── session.ts              # requireAuth, getCurrentSession
│   │   └── guards.ts               # requirePlatformAdmin, requireShelter
│   ├── storage/s3.ts
│   ├── email/transport.ts          # Resend wrapper, fallback console
│   ├── push/web-push.ts            # sendPush, VAPID config
│   ├── logger/index.ts
│   ├── rate-limit/index.ts
│   ├── event-bus/
│   │   ├── bus.ts                  # in-process EventEmitter
│   │   └── types.ts
│   ├── cron/auth.ts
│   └── index.ts
│
├── domains/                        # bounded contexts — la vraie logique métier
│   │
│   ├── identity/
│   │   ├── schema.ts               # colonnes users, sessions, ...
│   │   ├── queries/
│   │   │   ├── get-user-by-id.ts
│   │   │   └── ...
│   │   ├── actions/
│   │   │   ├── update-profile.ts
│   │   │   ├── delete-account.ts
│   │   │   └── ...
│   │   ├── services/               # logique interne, réutilisable
│   │   │   └── user-data-export.ts
│   │   ├── events.ts               # définitions { UserRegistered, UserDeleted, ... }
│   │   ├── components/             # UserBadge, AvatarPicker (métier, pas générique)
│   │   ├── listeners.ts            # abonne aux events d'autres modules si besoin
│   │   └── public.ts               # l'API exposée aux autres modules
│   │
│   ├── adoption/
│   │   ├── schema.ts               # cats, cat_photos, applications, favorites, testimonials
│   │   ├── queries/
│   │   ├── actions/
│   │   │   ├── create-cat.ts
│   │   │   ├── submit-application.ts
│   │   │   ├── submit-testimonial.ts
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── matching-score.ts   # algorithme de matching prédictif (phase 2)
│   │   ├── events.ts               # { CatPublished, ApplicationSubmitted, ApplicationAccepted, TestimonialPublished }
│   │   ├── components/
│   │   ├── listeners.ts            # listen CatShelterVerified de shelters
│   │   └── public.ts
│   │
│   ├── shelters/
│   ├── lost-found/
│   ├── messaging/
│   ├── moderation/
│   ├── notifications/              # écoute tous les events des autres modules
│   ├── gamification/               # écoute les events "resolution" et incrémente les compteurs
│   ├── tnr/                        # futur
│   ├── vet-network/                # futur
│   ├── analytics/                  # futur
│   ├── billing/                    # futur
│   └── community/                  # futur
│
└── app/                            # Next.js routes — orchestration uniquement
    ├── (public)/
    ├── (app)/
    ├── (shelter)/
    ├── (admin)/
    ├── (tnr)/                      # futur : interface associations TNR
    ├── api/
    │   ├── auth/[...all]/
    │   ├── cron/
    │   ├── messages/
    │   └── ...
    └── layout.tsx
```

### Pourquoi cette structure

- **`app/` ne fait plus que de l'orchestration** : les pages/routes appellent `domains/*/actions` et `domains/*/queries` via leur `public.ts`. Zéro logique métier dans `app/`.
- **Chaque domaine est une unité déplaçable** : on peut décider de déplacer `domains/tnr` dans une autre app du monorepo demain sans toucher au reste.
- **`public.ts` par domaine** : fait office d'interface. On fait évoluer l'API publique en toute conscience. Le reste du domaine (`services/`, `internal-helpers.ts`) est privé.
- **Events explicites** : `events.ts` par module liste les events émis. `listeners.ts` liste les abonnements. L'observabilité du couplage est claire.
- **Schema par domaine** : `schema.ts` de chaque domaine exporte ses tables. Un barrel `infrastructure/db/schema.ts` les réexporte tous pour Drizzle Kit qui a besoin d'une vue globale pour les migrations.

---

## 4. Règles de dépendance (le cœur du sujet)

Un monolithe modulaire ne vaut que par ses **frontières respectées**.

```
┌────────────────────────────────────────────────────────┐
│                         app/                           │  ← orchestration
└─────────┬──────────────────┬──────────────┬────────────┘
          │                  │              │
          ▼                  ▼              ▼
┌──────────────────────────────────────────────────────┐
│                     domains/*                        │  ← métier
│   ┌──────────────────────────────────────────────┐   │
│   │ inter-domain : via public.ts et events only  │   │
│   └──────────────────────────────────────────────┘   │
└─────────┬──────────────────┬──────────────┬──────────┘
          │                  │              │
          ▼                  ▼              ▼
┌──────────────────────────────────────────────────────┐
│                 infrastructure/ + shared/            │  ← plomberie & primitives
└──────────────────────────────────────────────────────┘
```

### Règles précises

1. **`shared/`** : n'importe **rien** d'autre que Node/externes. Zéro imports domaines, zéro infrastructure.
2. **`infrastructure/`** : importe `shared/` et des libs externes. Zéro domaines.
3. **`domains/A`** :
   - peut importer `shared/` et `infrastructure/`
   - peut importer `domains/B/public` (l'API publique de B) **et c'est tout de B**
   - ne peut **jamais** importer `domains/B/actions`, `domains/B/queries`, `domains/B/schema` directement
4. **`app/`** :
   - peut importer `shared/`, `infrastructure/`, `domains/*/public`
   - doit préférer `public.ts` plutôt que taper dans les internals des domaines

### Communication cross-domain : events > imports directs

**Mauvais** (couplage fort) :

```ts
// dans domains/adoption/actions/accept-application.ts
import { emitNotification } from "@/domains/notifications/public";
// ...
await emitNotification({ type: "application_update", ... });
```

**Bon** (découplé via event) :

```ts
// domains/adoption/actions/accept-application.ts
import { publish } from "@/infrastructure/event-bus";
import type { ApplicationAccepted } from "../events";
// ...
publish<ApplicationAccepted>({
  type: "adoption.application_accepted",
  applicationId,
  catId,
  userId,
  shelterNotes,
});

// domains/notifications/listeners.ts
subscribe("adoption.application_accepted", async (event) => {
  await emitNotification({
    userId: event.userId,
    type: "application_update",
    ...
  });
});
```

**Bénéfices** :
- `adoption` ne sait rien de `notifications`. Demain, on ajoute un listener dans `analytics` qui compte les acceptances → zéro touche à `adoption`.
- Pour le test de `acceptApplication`, on mock juste le bus → trivial.
- Plus tard, `event-bus` → Redis pub/sub → cohérent entre processes.

### Exception justifiée : reads synchrones

Pour les reads (queries) côté cross-domain, les events ne marchent pas (il faut une réponse immédiate). Exemple : pour afficher la fiche d'un chat, on a besoin du refuge associé.

**Pattern** : `domains/shelters/public.ts` expose `getShelterById(id)`. `domains/adoption/queries/get-cat-with-details.ts` l'appelle via `import { getShelterById } from "@/domains/shelters/public"`. C'est OK, c'est l'API publique.

La règle simple : **tout ce qui passe par `public.ts` est un contrat**, on le fait évoluer volontairement.

---

## 5. Migration progressive — roadmap par étapes

Passer de l'organisation actuelle à la cible **sans rewrite** — en 5 phases, chacune autonome.

### Phase 1 — Poser les fondations partagées (1-2 semaines)

But : créer `shared/` et `infrastructure/` sans rien casser.

- Créer `src/shared/ui`, `src/shared/utils`, `src/shared/validation`
- Déplacer `components/ui/*` → `shared/ui/*`
- Déplacer `lib/utils.ts`, `lib/geo.ts`, `lib/validators/*` → `shared/*`
- Créer `src/infrastructure/` avec sous-modules
- Déplacer `server/db/`, `server/auth/`, `lib/s3.ts`, `lib/email.ts`, `lib/logger.ts`, `lib/rate-limit.ts`, `server/notifications/push.ts`, etc.
- Tsconfig paths : `@shared/*`, `@infra/*`
- Typecheck passe

Pas de nouvelle logique, juste du déplacement. Commit par module.

### Phase 2 — Extraire les domaines mûrs un par un (2-4 semaines)

Ordre suggéré (du plus autonome au plus couplé) :

1. **`messaging`** (déjà bien encapsulé) → `domains/messaging`
2. **`moderation`** → `domains/moderation`
3. **`gamification`** (petit module) → `domains/gamification`
4. **`shelters`** → `domains/shelters`
5. **`lost-found`** → `domains/lost-found`
6. **`adoption`** (le plus gros) → `domains/adoption`
7. **`identity`** → `domains/identity`
8. **`notifications`** → `domains/notifications` (en dernier, beaucoup de cross-domain)

Pour chaque domaine :
- Créer `domains/X/` avec sous-dossiers
- Déplacer le code concerné (`actions/`, `queries/`, `components/`)
- Extraire le schema de `server/db/schema.ts` → `domains/X/schema.ts`
- Créer `domains/X/public.ts` qui exporte l'API
- Mettre à jour tous les imports cassés (recherche/remplace)
- Tsconfig path : `@adoption/*`, `@shelters/*`, etc.

À ce stade, les domaines existent mais ils s'importent encore directement. C'est déjà **infiniment mieux** côté lisibilité.

### Phase 3 — Découpler via events (2-3 semaines)

- Créer l'event bus dans `infrastructure/event-bus/` (déjà existant pour messaging — généraliser)
- Pour chaque paire de domaines où A importe B pour une **action** (pas pour un read) :
  - Définir l'event dans `A/events.ts`
  - Publier l'event dans `A/actions/*` au lieu d'appeler B
  - Ajouter le listener dans `B/listeners.ts`

Exemples concrets à refactorer :
- `adoption.cats.createCat` émet `CatPublished` → `notifications` écoute et notifie les followers
- `adoption.applications.accept` émet `ApplicationAccepted` → `notifications` envoie email + push
- `lost-found.respondToMatch` émet `ReportResolved` → `gamification` crédite les contributeurs
- `shelters.verifyShelter` émet `ShelterVerified` → `moderation` peut logger, `notifications` peut pinger les admins

### Phase 4 — Faire respecter les frontières par la tool (1 semaine)

Installer **dependency-cruiser** ou **eslint-plugin-boundaries** et définir les règles :

```js
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'shared-cannot-import-domain',
      from: { path: '^src/shared/' },
      to: { path: '^src/(domains|infrastructure|app)/' },
    },
    {
      name: 'infrastructure-cannot-import-domain',
      from: { path: '^src/infrastructure/' },
      to: { path: '^src/(domains|app)/' },
    },
    {
      name: 'domain-can-only-import-other-domain-public',
      from: { path: '^src/domains/([^/]+)/' },
      to: {
        path: '^src/domains/([^/]+)/',
        pathNot: '^src/domains/$1/',  // same domain OK
      },
      via: { pathNot: '/public$' },   // must go through /public
    },
  ],
};
```

Et ajouter à la CI : `bun x depcruise src --config .dependency-cruiser.js` dans le workflow.

### Phase 5 — Envisager le monorepo (plus tard, quand les signaux sont là)

Signaux à surveiller avant de passer en monorepo :

| Signal | Implication |
|---|---|
| 2+ devs collaborent régulièrement | Les builds partagés ralentissent, besoin d'isolation |
| Un module (TNR notamment) a sa propre UX complète qui mérite une app dédiée | Mobile-first, PWA spécifique |
| Temps de build > 5 min | L'échelle monolithe devient une friction |
| Besoin de déployer un module sans le reste | Infra prête pour déploiements séparés |
| Équipe divisée par domaine (une équipe TNR, une équipe adoption) | Ownership clair nécessaire |

Tant que **zéro** de ces signaux → reste en monolithe modulaire. C'est optimal.

---

## 6. Structure monorepo cible (phase 5, si besoin)

```
dorloter/
├── apps/
│   ├── web/                     # Next.js — public + adoptant + refuge + admin
│   ├── tnr/                     # Next.js dédié TNR (UX, auth, perms différents)
│   └── mobile/                  # Capacitor + PWA pour terrain
│
├── packages/
│   ├── ui/                      # components Tailwind partagés
│   ├── db/                      # Drizzle client + migrations
│   ├── auth/                    # Better Auth config commune
│   ├── storage/                 # S3 wrapper
│   ├── email/                   # templates + Resend wrapper
│   ├── event-bus/               # in-process + Redis adapter
│   │
│   ├── identity/                # domain packages (publient leur public.ts comme export)
│   ├── adoption/
│   ├── shelters/
│   ├── lost-found/
│   ├── messaging/
│   ├── tnr/
│   ├── notifications/
│   └── ...
│
├── turbo.json                    # Turborepo pour les builds incrémentaux
├── pnpm-workspace.yaml           # ou bun workspaces
└── docker/
    └── docker-compose.prod.yml   # orchestre les 1-3 apps ensemble
```

**Turborepo** : gère les builds incrémentaux (un changement dans `@dorloter/adoption` ne rebuild que les apps qui en dépendent).

**Déploiement** : chaque app peut être déployée indépendamment. Partage la même DB (ou bases séparées si domaines vraiment indépendants).

**Coût** : maintenance (pipelines CI par app, versioning des packages internes). À ne faire que **quand c'est vraiment nécessaire**.

---

## 7. Schéma de base de données — stratégie

Avec des domaines séparés, plusieurs options :

### Option A — Base unique, schémas logiques (recommandé)

Une seule DB Postgres, mais chaque domaine a son **PostgreSQL schema** :

```sql
-- Au lieu de :
CREATE TABLE cats (...);
CREATE TABLE reports (...);

-- On fait :
CREATE SCHEMA adoption;
CREATE SCHEMA lost_found;
CREATE SCHEMA tnr;

CREATE TABLE adoption.cats (...);
CREATE TABLE lost_found.reports (...);
CREATE TABLE tnr.colonies (...);
```

Avantages :
- Isolation namespace (évite `tnr_colony` + `adoption_cat` préfixés)
- Grants PG par schéma (ex. rôle `dorloter_tnr` peut lire/écrire `tnr.*`, rien d'autre)
- Migrations par schéma
- Préparation au split futur en bases séparées

Drizzle supporte les schémas PG natifs via `pgSchema('tnr')`. Le refactor est mineur.

### Option B — Bases séparées par domaine (plus tard)

Quand un domaine devient vraiment énorme (millions de lignes), on peut le sortir sur une DB dédiée. Exemple : `adoption` et `tnr` sur la même instance, `analytics` sur une instance dédiée avec Postgres en lecture seule.

Cette option reste **future**. Elle n'est nécessaire qu'à grande échelle.

### Option C — Actuel (tables plates)

On peut tout à fait garder ça. Pas bloquant. Juste moins propre quand la liste des tables grossit.

**Ma reco** : passer en schémas PG (Option A) pendant la phase 2 de migration des domaines. Ça s'intègre naturellement.

---

## 8. Bénéfices concrets

Après migration, la liste de ce qu'on gagne :

| Bénéfice | Avant | Après |
|---|---|---|
| Ajouter un domaine (ex. TNR) | Impact sur tout le repo | `domains/tnr/` self-contained |
| Tester un domaine | Très couplé à la DB complète | Isoler via fakes/mocks des events |
| Comprendre qui dépend de quoi | Grep manuel | `depcruise --output-type dot \| dot` = graphe |
| Onboarder un 2e dev | Il doit tout comprendre | Il bosse sur 1 module |
| Sortir une feature en indépendance | Pas possible | Deploy d'un module isolé (phase 5) |
| Lisibilité de la structure | Arbre plat 100+ fichiers | Domaines nommés métier |

### Ce qui ne change pas

- **Performance runtime** : zéro overhead. Les events in-process sont des callbacks Node.
- **Next.js** continue de fonctionner comme avant. Server Actions dans `domains/X/actions/` marchent identiquement.
- **L'expérience utilisateur** : rien du tout.
- **Les tables DB** (si on reste en Option C ou si on migre en schémas de façon progressive).

---

## 9. Risques et garde-fous

### Risque 1 — Over-engineering

**Symptôme** : créer 50 events pour des cas où un appel direct suffirait.

**Garde-fou** : règle empirique — **émettre un event quand ≥ 2 listeners existent ou sont plausibles**. Sinon, un appel direct via `public.ts` reste acceptable.

### Risque 2 — Bus trop bavard

**Symptôme** : chaque micro-action émet un event. Le bus devient un goulot cognitif.

**Garde-fou** : events = **faits métier** (`CatPublished`, `ApplicationAccepted`), pas des détails techniques (`RowInserted`, `QueryStarted`).

### Risque 3 — Migration qui dure 6 mois et bloque les features

**Symptôme** : le refacto n'est jamais fini.

**Garde-fou** : **phases courtes**, chacune mergeable indépendamment. Entre deux phases, tu peux livrer des features. Si tu ne peux pas suspendre 1-2 semaines pour Phase 1 → fait Phase 1 par chirurgie, en déplaçant 1 sous-module à la fois.

### Risque 4 — Events difficiles à debug

**Symptôme** : « qui a bougé ce compteur ? ». Comportement distribué.

**Garde-fou** : logger chaque publish + chaque handler dans `lib/logger`. Grep par event.id pour voir la chaîne.

### Risque 5 — Abstractions qui se généralisent mal

**Symptôme** : tu fais une API publique `shelters.public.ts`, puis 6 mois plus tard tu dois la casser complètement.

**Garde-fou** : commencer par des APIs **minimales**. Expose juste ce qui est vraiment utile aux autres modules. Évolue en ajoutant, pas en refactorant.

---

## 10. Décisions à acter avant de commencer

- ☐ **Validation** : on part sur le monolithe modulaire (phase 1-4), pas sur le monorepo direct
- ☐ **Naming** : `domains/` vs `modules/` vs `contexts/` — on choisit `domains/` (DDD-inspired)
- ☐ **Path aliases** : `@shared/*`, `@infra/*`, `@adoption/*`, `@shelters/*`, etc. (modifier `tsconfig.json`)
- ☐ **Event bus** : on généralise celui de messaging — nouveau `infrastructure/event-bus/` avec même API
- ☐ **Schémas PG** : Option A (un schéma par domaine) oui/non ?
- ☐ **Dependency linter** : on adopte `dependency-cruiser` dans la CI
- ☐ **Point de départ** : phase 1 lance en premier (déplacement `shared/` + `infrastructure/`)

---

## 11. Étape suivante concrète

Si tu valides cette direction, on commence par **une PR d'inauguration** :

1. Créer `src/shared/` et `src/infrastructure/` vides avec leur `index.ts`
2. Déplacer **3 fichiers pilotes** pour valider le pattern : `lib/utils.ts` → `shared/utils/`, `server/db/index.ts` → `infrastructure/db/`, `lib/logger.ts` → `infrastructure/logger/`
3. Mettre à jour les imports cassés
4. Ajouter `tsconfig.json` paths
5. Typecheck + smoke test

Effort : ~1h. Objectif : prouver le pattern et aligner sur les conventions avant de dérouler l'ensemble. Ensuite on enchaîne module par module au rythme choisi.

---

## 12. TL;DR

- **Monolithe modulaire** > microservices (pour toi, solo dev)
- **Domains / Infrastructure / Shared** : 3 couches, règles d'import strictes
- **Communication inter-domaine via events** (bus in-process, scalable vers Redis)
- **Migration incrémentale en 5 phases**, jamais de big bang
- **Outils** : dependency-cruiser pour lint, Turborepo si on passe en monorepo un jour
- **Gain** : lisibilité, testabilité, scalabilité organisationnelle, préparation à la croissance

Le but n'est pas d'avoir une archi parfaite. C'est d'avoir une archi qui **ne t'empêche jamais d'ajouter un domaine** (TNR, vet network, billing…) sans devoir te battre avec le reste du code.
