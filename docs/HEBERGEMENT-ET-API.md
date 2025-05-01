# Hébergement professionnel & API partagée web/mobile (proposition historique)

> **Contexte** : ce document proposait, à l'époque du monolithe **Next.js**, de
> se doter d'une **API commune web + mobile**. Cette direction a depuis été
> **réalisée**, mais différemment de ce qui est esquissé ici : l'API est un
> service **NestJS / le service API** dédié (`apps/api`, routes `/api/v1`,
> OpenAPI sur `/api/v1/openapi`), l'auth est en **JWT** (et non plus Better Auth
> avec plugin `bearer`), le front web est une **SPA React + Vite** (`apps/web`)
> et le mobile **Expo** consomme le client typé `packages/api-client`
> (openapi-fetch). Les sections « conventions d'API », « stack mobile »,
> « hébergement de production » et « souveraineté EU » restent largement
> valables. En revanche tout ce qui concerne Server Actions, Better Auth,
> Drizzle, Zod côté serveur, ou « faire émerger l'API depuis Next.js » est
> **caduc**. Source de vérité du stack : **[CLAUDE.md](../CLAUDE.md)**.

Document de proposition pour faire évoluer Dorloter d'une app Next.js mono-cible vers un produit **web + mobile** propre, avec une **API commune**, sans casser l'existant ni sortir du périmètre solo-dev.

L'idée directrice : **un seul backend, deux clients**. On ne duplique ni l'auth, ni la base, ni la logique métier. La mobile consomme la même API que le web.

---

## 1. Vue d'ensemble cible

```
                ┌─────────────────────────┐
                │   Clients (frontends)   │
                │                         │
   ┌────────────┼────────────┐            │
   │            │            │            │
┌──▼──┐    ┌────▼────┐   ┌───▼────┐       │
│ Web │    │ Mobile  │   │ PWA    │       │
│ SSR │    │ Expo RN │   │ install│       │
└──┬──┘    └────┬────┘   └───┬────┘       │
   │            │            │            │
   │  Server    │  REST/JSON │  Server    │
   │  Actions   │  + Bearer  │  Actions   │
   │  + cookie  │  token     │  + cookie  │
   └────────────┼────────────┘            │
                │                         │
   ┌────────────▼────────────┐            │
   │   Next.js (monolithe)   │            │
   │                         │            │
   │  ┌───────────────────┐  │            │
   │  │ app/api/v1/*      │  │  REST publique mobile
   │  │ app/api/internal/*│  │  routes internes (cron, webhook)
   │  │ Server Actions    │  │  uniquement web
   │  └─────────┬─────────┘  │
   │            │            │
   │  ┌─────────▼─────────┐  │
   │  │ domains/*/services│  │  ← logique métier partagée
   │  │ (zéro UI, zéro    │  │    appelée par les 2
   │  │  dépendance HTTP) │  │
   │  └─────────┬─────────┘  │
   │            │            │
   │  ┌─────────▼─────────┐  │
   │  │ infrastructure/   │  │  DB, S3, push, email, auth
   │  └───────────────────┘  │
   └─────────────┬───────────┘
                 │
   ┌─────────────┼─────────────┐
   │             │             │
┌──▼──┐    ┌─────▼─────┐  ┌───▼────┐
│ PG  │    │ S3 / CDN  │  │ Push   │
│ +   │    │ Scaleway  │  │ APNs   │
│ GIS │    │ Object    │  │ FCM    │
│     │    │ Storage   │  │ WebPush│
└─────┘    └───────────┘  └────────┘
```

**Principe** : la couche `domains/*/services` (déjà amorcée via les `public.ts`) devient la **source de vérité métier**. Les Server Actions (web) et les routes API (mobile) sont des **fines coquilles** qui :
1. valident l'input avec Zod,
2. récupèrent l'utilisateur courant,
3. appellent un service de domaine,
4. formatent la réponse au format attendu par le client.

Pas de duplication de logique. Si on change la règle « un user ne peut candidater qu'une fois sur le même chat », elle change à un seul endroit.

---

## 2. Stratégie API : pourquoi REST plutôt que tRPC ou GraphQL

| Critère | REST + Zod + OpenAPI | tRPC | GraphQL |
|---|---|---|---|
| Compat mobile native | ✅ universel | ⚠️ nécessite client TS, pas idiomatique en Swift/Kotlin | ✅ |
| Cache HTTP standard | ✅ | ❌ | ❌ partiel |
| Versioning simple (v1, v2) | ✅ | ⚠️ | ⚠️ |
| Lisibilité (curl, Postman) | ✅ | ❌ | ⚠️ |
| Coût d'apprentissage | faible | faible (si TS partout) | élevé |
| Si on garde l'option Flutter ou natif plus tard | ✅ | ❌ | ✅ |

**Choix recommandé** : REST + Zod + génération OpenAPI 3.1 + client TS auto-généré pour Expo.

Stack concrète :
- Schémas Zod déjà partagés via `@infra/db` et `domains/*/schema.ts`
- Génération OpenAPI : `zod-openapi` (lib légère, ~30 lignes par route pour décrire request/response)
- Client TS pour mobile : `openapi-typescript` + `openapi-fetch` (génère un client typé depuis l'OpenAPI)

Si tu veux du tRPC plus tard (parce que ton mobile est aussi Expo donc full TS), c'est compatible : tu peux exposer `/api/trpc` en plus de `/api/v1/*` sans casser quoi que ce soit.

---

## 3. Auth : Better Auth supporte déjà web + mobile

Better Auth a deux modes qui cohabitent sans conflit :
- **Cookie session** (par défaut) — utilisé par le web, déjà en place
- **Bearer token** — utilisé par la mobile, à activer via le plugin `bearer`

Côté serveur :

```ts
// src/infrastructure/auth/auth.ts
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";

export const auth = betterAuth({
  // ... config existante
  plugins: [
    bearer(), // permet aux clients mobiles d'envoyer Authorization: Bearer <token>
  ],
});
```

Côté mobile (Expo) :
1. POST `/api/auth/sign-in/email` → reçoit un `token` en JSON
2. Stocke le token dans `expo-secure-store` (Keychain iOS, Keystore Android)
3. Ajoute le header `Authorization: Bearer <token>` à chaque requête API
4. Logout → DELETE `/api/auth/sign-out` + suppression du token local

**Aucune duplication d'auth**. La table `sessions` est partagée. Un user peut être connecté simultanément sur web + mobile, chaque session a son propre user_agent.

---

## 4. Structure de code proposée — monorepo léger

Aujourd'hui : un seul repo Next.js. À l'arrivée du mobile, deux options :

### Option A — Monorepo Turborepo (recommandé)

```
dorloter/
├── apps/
│   ├── web/                        # Next.js 16 actuel (tel quel, déplacé)
│   └── mobile/                     # Expo + React Native (nouveau)
│
├── packages/
│   ├── api-client/                 # Client TS auto-généré depuis OpenAPI
│   │   └── src/index.ts            # export { adoption, lostFound, shelters... }
│   │
│   ├── shared-types/               # Types Drizzle + ActionResponse + enums
│   │   └── src/index.ts
│   │
│   ├── shared-validators/          # Schémas Zod cross-platform
│   │   └── src/                    # adoption.ts, report.ts, application.ts
│   │
│   └── ui-kit/                     # (optionnel) tokens design partagés
│       └── src/tokens.ts           # couleurs, espaces — utilisables par RN aussi
│
├── turbo.json
└── package.json
```

**Avantages** : un `bun install` à la racine, tests groupés, CI unifiée, refactor cross-package atomique.

**Coût** : 1 jour de migration. Pas de réécriture, juste déplacer `src/` dans `apps/web/src/` et créer des packages.

### Option B — Repo séparé pour le mobile

Si la migration monorepo te paraît trop lourde, garde Next.js tel quel et crée un repo `dorloter-mobile` à côté. Le contrat partagé (types, validators) est publié comme package npm privé (GitHub Packages, gratuit) et consommé par les deux.

**Inconvénient** : friction sur les changements de contrat (publish + bump dans 2 repos). À éviter à long terme.

→ **Recommandation** : Option A le jour où tu commences sérieusement la mobile. D'ici là, prépare le terrain en factorisant les services dans `domains/*/services/` (les Server Actions deviennent de fines coquilles).

---

## 5. Stack mobile recommandée

| Choix | Pourquoi |
|---|---|
| **Expo (managed workflow)** | Build OTA, EAS Build cloud, pas de Xcode/Android Studio sur ta machine. Reste solo-friendly. |
| **React Native** (via Expo) | Réutilisation des compétences React/TS. Possible de partager certains hooks (`useFavorites`, `useAuth`) si bien isolés. |
| **expo-router** | Routing fichier-based comme Next.js → courbe d'apprentissage zéro |
| **NativeWind** | Tailwind en RN. Tokens design partagés avec le web. |
| **expo-location** | Géoloc native pour signalements |
| **expo-image-picker / camera** | Upload photos animal |
| **expo-notifications** | Push natif (APNs + FCM, gérés par Expo) |
| **expo-secure-store** | Stockage token Better Auth |
| **react-native-maplibre-gl** | Cartographie native, cohérent avec MapLibre côté web |
| **TanStack Query** | Cache + retry + refetch automatique de l'API |

Pas de Redux, pas de Zustand au début. TanStack Query suffit pour 90 % des besoins.

---

## 6. Hébergement de production

### Ce que tu as déjà (cf. `docs/DEPLOYMENT.md`)

VPS OVH VLE-4 / Hetzner CX22 + Docker Compose (Postgres, MinIO, Caddy, app). Sain, simple, ~7 €/mois. **Garde-le pour le MVP.**

### Évolutions à prévoir quand le trafic monte

| Composant | Aujourd'hui | À 1 000 users actifs | À 10 000+ users actifs |
|---|---|---|---|
| App Next.js | 1 conteneur | 2-3 conteneurs derrière Caddy load-balancé | Scaleway Serverless Containers (autoscale) |
| Postgres + PostGIS | conteneur Docker self-hosted | **Scaleway Database** managé (5-15€/mois, PostGIS supporté) | idem + read replica |
| Object storage (photos) | MinIO local | **Scaleway Object Storage** (S3-compat, EU, ~0,015€/Go/mois) | idem + CDN devant |
| CDN images | aucun | **BunnyCDN** (EU, 0,01€/Go) ou Scaleway Edge Services | idem |
| Email transactionnel | Resend | Brevo (FR) ou Resend EU region | idem + double provider failover |
| Push web | Web Push VAPID self | inchangé (gratuit, infini) | inchangé |
| Push mobile | — | **APNs (Apple) + FCM (Google)** via `web-push` ou `node-pushnotifications` | idem |
| Monitoring erreurs | logs Docker | **GlitchTip** self-hosted (Sentry-compat, EU) ou Sentry EU | idem + alerting Slack |
| Uptime | UptimeRobot | UptimeRobot + statuspage publique | idem |
| Analytics | aucun | **Plausible** self-hosted (RGPD-friendly, FR) | idem |
| Logs centralisés | `docker logs` | **Grafana Loki** self-hosted sur le même VPS | Loki + Grafana managé (Scaleway) |

### Souveraineté européenne — checklist

Le projet vise la souveraineté EU (cf. CLAUDE.md). Voici les choix conformes :

- ✅ **VPS** : OVH (FR), Hetzner (DE), Scaleway (FR), Infomaniak (CH)
- ✅ **DB managée** : Scaleway, OVH Public Cloud Databases, Aiven EU, Neon (région EU)
- ✅ **Object storage** : Scaleway Object Storage, OVH Object Storage, Bunny Storage
- ✅ **CDN** : BunnyCDN, Scaleway Edge Services, Fastly (POP EU, mais entreprise US)
- ✅ **Email** : Brevo (FR), Mailjet (FR), Resend (US mais avec data residency EU sur plan Pro)
- ✅ **Monitoring** : GlitchTip self-hosted, Sentry EU region, Grafana Cloud EU
- ✅ **Cartes** : MapLibre + tuiles MapTiler (CH) ou Protomaps self-hosted, déjà OK
- ⚠️ **Push mobile** : APNs et FCM sont incontournables (Apple et Google contrôlent les canaux push iOS/Android). Pas de souveraineté possible ici sans renoncer aux notifications natives. Mitigation : limiter au strict minimum les données envoyées dans le payload (juste un `notificationId`, le client va chercher le contenu via l'API authentifiée).
- ✅ **App Store / Play Store** : pas de souveraineté possible non plus si tu veux distribuer sur iOS/Android. Alternative partielle : F-Droid pour Android, PWA pour iOS (limité).

### Option « zéro maintenance » : PaaS européen

Si tu veux te débarrasser de la gestion VPS un jour :
- **Clever Cloud** (FR) — push git, app + DB managées, ~25-40€/mois pour Dorloter
- **Scaleway Serverless** — autoscale à 0, pay-per-request
- **Coolify** ou **Dokploy** self-hosted — PaaS open-source sur ton propre VPS, joli compromis

Tant que tu es solo et que les heures de maintenance Docker restent < 2h/mois (ce qui est le cas vu ton setup), reste sur le VPS.

---

## 7. Plan de migration progressif

### Étape 0 — État des lieux (actuel)
- Next.js monolithe, Server Actions partout, mobile = 0
- Quelques routes API (`/api/upload`, `/api/notifications/subscribe`, `/api/messages`)

### Étape 1 — Préparer le terrain (faisable maintenant, sans mobile)
1. **Factoriser les services** : pour chaque domaine, créer `domains/X/services/` qui contient la logique métier pure (pas d'accès Next.js, pas de `revalidatePath`, retourne des `Result<T>`).
2. **Server Actions deviennent des coquilles** : valident, appellent le service, gèrent `revalidatePath`.
3. **Bearer plugin Better Auth** activé dès maintenant — coût quasi nul, prêt pour la mobile.
4. **OpenAPI partiel** : décrire les endpoints existants (`/api/upload`, `/api/messages`) avec `zod-openapi`. Documente, ne casse rien.

### Étape 2 — Première API publique v1
1. Créer `app/api/v1/` avec les endpoints lecture seule pour le mobile :
   - `GET /api/v1/pets` (catalogue adoption, paginé)
   - `GET /api/v1/pets/:id` (fiche détaillée)
   - `GET /api/v1/reports?bbox=...` (signalements dans une zone)
   - `GET /api/v1/shelters/:slug` (page refuge)
   - `POST /api/v1/auth/*` (déjà existant via Better Auth)
2. Générer l'OpenAPI à `/api/v1/openapi.json`.
3. Tests d'intégration sur ces routes (Vitest + msw).

### Étape 3 — Mobile MVP en lecture seule
1. Migration monorepo Turborepo (1 jour).
2. App Expo qui consomme l'API v1 : navigation par onglets (Adopter / Signalements / Mon compte), connexion, vitrine.
3. Pas de signalement ni candidature côté mobile pour le V1 — uniquement consultation. Renvoi vers le web pour les actions.
4. Distribution interne via EAS Update + TestFlight / Play Console internal track.

### Étape 4 — Mobile complète
1. Ajout des endpoints d'écriture v1 :
   - `POST /api/v1/reports` (créer signalement)
   - `POST /api/v1/applications` (candidater)
   - `POST /api/v1/favorites/:petId`
   - `POST /api/v1/notifications/register-device` (token APNs/FCM)
2. Upload photos via presigned URL S3 (pas de proxy par l'app).
3. Géoloc native, carte native MapLibre, push natifs.
4. Sortie publique App Store + Play Store.

### Étape 5 — Optimisations
- CDN devant les images
- DB managée
- GlitchTip pour le monitoring
- Statuspage publique

**Durée totale réaliste pour un solo dev** : 3-4 mois entre l'étape 1 et la sortie publique mobile, en travaillant ~2 jours/semaine dessus. Étapes 1-2 = ~2 semaines, étape 3 = ~3-4 semaines, étape 4 = ~6-8 semaines.

---

## 8. Conventions API à figer dès le début

Pour ne pas avoir à les changer plus tard :

- **Versioning** : `/api/v1/*` toujours préfixé. Un breaking change → `/api/v2/*` en parallèle pendant 6 mois.
- **Format réponse** :
  ```json
  // Succès
  { "data": { ... } }
  // Liste paginée
  { "data": [...], "pagination": { "cursor": "abc", "hasMore": true } }
  // Erreur
  { "error": { "code": "PET_NOT_FOUND", "message": "..." } }
  ```
- **Codes d'erreur** : enum stable, jamais de message technique brut.
- **Pagination** : cursor-based (déjà la convention CLAUDE.md). Pas d'offset.
- **Localisation** : header `Accept-Language: fr-FR` → réponses traduites côté serveur. Anglais en seconde langue.
- **Rate limiting** : par IP + par user, valeurs strictes sur les endpoints écriture. `429` avec `Retry-After`.
- **Idempotency** : header `Idempotency-Key` accepté sur les POST critiques (création signalement, candidature) — évite les doublons en cas de timeout réseau mobile.
- **Tracing** : header `X-Request-Id` propagé partout, log structuré avec ce champ.
- **CORS** : web même origine (pas de CORS), mobile pas de CORS (requêtes natives). Pas d'`Access-Control-Allow-Origin: *`.
- **Auth** : `Authorization: Bearer <token>` pour mobile, cookie `__Secure-better-auth.session_token` pour web. Le serveur accepte les deux automatiquement avec Better Auth.

---

## 9. Coûts indicatifs en production

Pour 1 000 users actifs / mois, ~50 000 requêtes API/jour, ~2 Go d'images uploadées/mois :

| Poste | Provider | Coût mensuel |
|---|---|---|
| VPS app + DB self-hosted | OVH VLE-4 | 7 € |
| Backups vers Object Storage | Scaleway | 1 € |
| Domaine | OVH | 1 € (annualisé) |
| Email transactionnel | Brevo plan gratuit (300/jour) | 0 € |
| Push web | self-hosted VAPID | 0 € |
| Push mobile (APNs + FCM) | Apple + Google | 0 € (gratuit pour l'envoi) |
| Apple Developer Program | Apple | 8 € (99 $/an) |
| Google Play Console | Google | 1 € (one-shot 25 $) |
| Tuiles carto | MapTiler 100 k req/mois | 0 € |
| Analytics Plausible | self-hosted ou 9 €/mois | 0-9 € |
| Sentry EU / GlitchTip | self-hosted | 0 € |
| **Total mensuel** | | **~17 € + 99 $/an Apple** |

À 10 000 users actifs : ajouter ~30-50 €/mois pour DB managée + CDN. Reste très raisonnable.

---

## 10. Synthèse des décisions à prendre

| Décision | Choix recommandé | À trancher quand |
|---|---|---|
| Type d'API | REST + Zod + OpenAPI | maintenant |
| Auth mobile | Better Auth `bearer` plugin | maintenant (gratuit) |
| Mono- vs multi-repo | Monorepo Turborepo | au démarrage du mobile |
| Stack mobile | Expo + React Native + expo-router + NativeWind | au démarrage du mobile |
| Cartographie mobile | react-native-maplibre-gl | au démarrage du mobile |
| Hébergement prod | VPS OVH/Hetzner + Docker Compose (déjà en place) | inchangé |
| DB managée | Garde self-hosted, migre à 1k+ users | quand le PG du VPS gémit |
| CDN images | BunnyCDN | quand l'égress S3 dépasse 100 Go/mois |
| Monitoring | GlitchTip self-hosted | avant la sortie publique mobile |

**Le seul changement structurel à faire dès maintenant** : factoriser les Server Actions en services de domaine purs, pour que l'API mobile s'y branche sans duplication. Tout le reste peut attendre la décision « on lance le mobile ».
