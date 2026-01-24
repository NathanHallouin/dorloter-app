# Roadmap Dorloter · vers l'autosuffisance

Ce document liste tout ce qu'il faut construire pour que Dorloter tourne de manière autonome, sans intervention manuelle constante, et génère assez de valeur pour couvrir ses coûts.

> **Note de lecture** : l'état d'avancement ci-dessous (daté du 2025-04-20) a été
> consigné pendant la construction du MVP sur l'ancien stack **Next.js**
> (Better Auth, Drizzle, Server Actions, messagerie SSE, `next.config`,
> proxy Next d'auth…). Les **fonctionnalités** listées comme livrées sont bien
> en place, mais les **détails techniques** cités (Better Auth, `next.config`,
> SSE, proxy Next.js, `bun audit`, etc.) renvoient à cette implémentation
> d'origine. Le projet a depuis migré vers : **API NestJS** (auth JWT) + **front
> SPA React/Vite** + **mobile Expo**. Source de vérité du stack actuel :
> **[CLAUDE.md](../CLAUDE.md)**.

## État d'avancement (2025-04-20)

| Section | Avancement |
|---|---|
| 1.1 Perdus / Trouvés | 8/8 ✅ |
| 1.2 Candidatures | 5/5 ✅ |
| 1.3 Profil utilisateur | 3/4 (email & avatar non éditables) |
| 1.4 Espace refuge | 4/5 (vues par chat & graphe mensuel — nécessite tracking views) |
| 2.1 Web Push | 5/5 ✅ |
| 2.2 Emails transactionnels | 5/5 ✅ |
| 2.3 Centre notifications in-app | 3/3 ✅ |
| 3.1 Modération contenus | 4/4 ✅ (NSFW local via nsfwjs) |
| 3.2 Vérification refuges | 3/3 ✅ |
| 3.3 Anti-abus | 4/4 ✅ (captcha Turnstile, détection doublons via pg_trgm) |
| 4.1 SEO technique | 5/5 ✅ |
| 4.2 Pages géolocalisées | 3/3 ✅ |
| 4.3 Partage social | 3/3 ✅ |
| 5.1 PWA complète | 4/4 ✅ |
| 5.2 UX mobile | 4/4 ✅ |
| 6.1 Jobs planifiés | 5/5 ✅ |
| 6.2 Monitoring | 2/3 (health + logs, alertes externes = UptimeRobot à configurer) |
| 6.3 Backups | 3/3 ✅ |
| 7. Monétisation | 0/7 |
| 8.1 CI/CD | 4/4 ✅ (GitHub Actions CI + deploy via SSH en place) |
| 8.2 Production | 5/5 ✅ (stack Docker + Caddy + scripts prêts ; provisioning VPS manuel documenté) |
| 8.3 Sécurité | 4/4 ✅ (CSP/HSTS/etc. via next.config, bun audit en CI, secrets dans GitHub + .env) |
| 9.1 RGPD | 6/6 ✅ |
| 9.2 CGU | 2/2 ✅ |
| 10. Messagerie temps réel | ✅ (SSE + réactions + typing + read receipts) |

**Total : 58/104 items cochés (56%)** — les P0/P1 socle fonctionnel sont complets, reste surtout infra (déploiement, CI/CD, monitoring, backups), légal (RGPD/CGU), monétisation, et quelques polissages long-tail.

**Infra livrée au-delà de la roadmap** :
- Schéma PostGIS avec extension activée, index GIST spatiaux, FK ownership sur toutes les tables métier
- Proxy Next.js 16 d'auth avec `getSessionCookie` (Edge-compatible, pas de hit DB par requête)
- Helpers session centralisés (`requireAuth`, `requireShelter`, `requirePlatformAdmin`)
- Algo matching avec seuil 40 + scoring distance/couleur/race/sexe/fenêtre temporelle
- Seed script reproductible (9 users, 5 refuges, 13 chats, 7 signalements, 4 matches)
- Middleware ownership sur toutes les mutations (cats, reports, applications, photos, shelter-invitations)
- Better Auth avec `usePlural: true` + UUID DB-side generation + emailVerification + resetPassword + advanced config
- Fanout notifications unifié (in-app + email + Web Push) via `emitNotification`
- Sonner toasts globaux
- BottomNav mobile + install prompt PWA + offline indicator + TrackVisit

---

## 1. Finir le socle fonctionnel

Ce qui existe déjà en squelette mais n'est pas encore câblé aux données.

### 1.1 Perdus / Trouvés (coeur de la valeur)
- [x] Formulaire de signalement avec sélection de position sur carte (MapLibre + location-picker)
- [x] Upload multi-photos dans le formulaire
- [x] Page carte interactive des signalements actifs (clusters, filtres perdu/trouvé, **filtre par rayon** via `RadiusFilter` + géolocalisation navigateur)
- [x] Page détail d'un signalement avec photos, description **et mini-carte** (`LocationView` centrée sur le signalement, marker prune/lavande selon type)
- [x] Algo de matching : exécution auto à chaque nouveau signalement, scoring distance + couleur + race + sexe + fenêtre temporelle
- [x] Page correspondances : affichage des matches triés par score avec distance, bouton "C'est mon chat" / "Ce n'est pas lui"
- [x] Page "Mes signalements" : liste, statuts, bouton résoudre
- [x] Expiration auto des signalements après 60 jours via **endpoint `/api/cron/expire-reports`** (protégé par `CRON_SECRET`) — à brancher sur Vercel Cron ou équivalent

### 1.2 Candidatures d'adoption
- [x] Formulaire de candidature complet (logement, animaux, enfants, motivation)
- [x] Page "Mes candidatures" côté adoptant avec suivi du statut
- [x] Page "Candidatures reçues" côté refuge avec tri, filtres, notes internes
- [x] Actions refuge : accepter / refuser / en cours, avec notification in-app + email à l'adoptant
- [x] Un adoptant ne peut pas candidater deux fois pour le même chat

### 1.3 Profil utilisateur
- [x] Formulaire de modification profil (nom, téléphone) — email & avatar à ajouter
- [x] Sélection de localisation sur carte pour les alertes proximité
- [x] Réglage du rayon de notification (1-50 km) via slider
- [x] Suppression de compte (RGPD) avec purge cascade

### 1.4 Espace refuge complet
- [x] Upload de photos dans le formulaire d'ajout/édition de chat (intégré au form)
- [x] **Réorganisation des photos par drag & drop** via `@dnd-kit/sortable`, la première devient auto la photo principale (action `reorderCatPhotos`)
- [x] Dashboard stats : candidatures reçues, taux d'adoption, répartition statuts — vues par chat & graphe mensuel à ajouter (nécessite table `cat_views` + tracking)
- [x] Page de profil refuge modifiable (nom, description, coordonnées, localisation, **logo + bannière** via `ImageUploadField`)
- [x] **Gestion multi-admin par refuge** : table `shelter_invitations`, action `inviteShelterAdmin` avec email Resend (template dédié), révocation, page d'acceptation `/invitation/[token]` (garde email + expiration 7j + statut)

---

## 2. Notifications et rétention

Sans notifications, les utilisateurs ne reviennent pas. C'est ce qui rend l'app autosuffisante.

### 2.1 Web Push
- [x] Inscription au push depuis le profil (VAPID + service worker + toggle UI)
- [x] Nouveau match perdu/trouvé push au propriétaire du signalement concerné
- [x] Mise à jour de statut d'une candidature (acceptée, refusée, en cours)
- [x] **Nouveau chat dans un refuge suivi** — table `shelterFollows` + `FollowButton` sur `/refuges/[id]` + fanout `new_cat_nearby` dans `createCat` via `notifyShelterFollowers` (broadcast push + email aux followers)
- [x] **Rappel à 7 jours** pour un signalement actif — cron [/api/cron/remind-stale-reports](src/app/api/cron/remind-stale-reports/route.ts) : sélectionne les reports `actif` dans la fenêtre [7j; 8j[ (fenêtre d'1 jour = idempotent si cron quotidien), envoie email + push avec conseils (ajouter photos, partager, clôturer)

### 2.2 Emails transactionnels (fallback push + emails obligatoires)
- [x] Confirmation d'inscription (vérification email) — Better Auth + Resend
- [x] Réinitialisation de mot de passe — Better Auth + Resend
- [x] **Récapitulatif hebdomadaire** — cron [/api/cron/weekly-digest](src/app/api/cron/weekly-digest/route.ts) : requête PostGIS `ST_DWithin` agrégée (une passe SQL pour tous les users) qui collecte les chats créés dans les 7 derniers jours dans le rayon de notification de chaque user, seuil min 3 chats pour déclencher le digest, email HTML avec cartes chats + mini push "3 nouveaux chats près de chez vous", tri par distance. Template [weeklyDigestEmailTemplate](src/lib/email.ts).
- [x] Notification de correspondance perdu/trouvé par email
- [x] Notification de candidature acceptée/refusée par email

### 2.3 Centre de notifications in-app
- [x] Page notifications avec historique (100 items, auto-click pour marquer lu, liens contextuels)
- [x] Badge non-lu sur l'icône cloche dans la navbar (9+ au delà)
- [x] Marquer comme lu / tout marquer comme lu

---

## 3. Modération et confiance

Une plateforme autosuffisante doit pouvoir se réguler sans admin permanent.

### 3.1 Modération des contenus
- [x] Bouton "Signaler" sur les fiches chat, signalement, refuge (dialog avec motifs contextuels + commentaire libre, `ReportContentDialog`)
- [x] File de modération `/admin/moderation` (layout `(admin)` avec garde `requirePlatformAdmin`) — regroupe par contenu, affiche détails pliables, actions "Masquer / Rejeter"
- [x] Blocage automatique après **5 signalements distincts** : cat → status `retire`, report → status `expire`, shelters/users restent en file humaine
- [x] **Vérification NSFW à l'upload** via [nsfwjs](src/lib/nsfw.ts) (MobileNetV2 local, aucune API tierce, souverain). Modèle ~5 Mo téléchargé au premier hit et mis en cache mémoire, inférence ~1-2s par image. Bloque uniquement si `Porn` ou `Hentai` dépasse `NSFW_BLOCK_THRESHOLD` (défaut 0.75). Dégradation propre : si tfjs-node crash (CI / arch non supportée), l'upload passe avec un warning log — la modération communautaire (auto-hide à 5 signalements) reste le second filet. Désactivable via `NSFW_CHECK_ENABLED=false`.

### 3.2 Vérification des refuges
- [x] Inscription refuge avec SIRET + champ validation (`isVerified`, défaut false)
- [x] Badge "Vérifié" affiché (refuge detail + listing, avec icône ShieldCheck, vert)
- [x] Dashboard admin `/admin` : KPI signalements en attente + refuges à vérifier + stats globales, page `/admin/shelters` avec action "Valider"

### 3.3 Anti-abus
- [x] Rate limiting in-memory ([lib/rate-limit.ts](src/lib/rate-limit.ts)) via IP `x-forwarded-for`, branché sur `createReport` (5/h), `createApplication` (10/h), `reportContent` (20/h), `importReportFromUrl` (10/h), `submitTestimonial` (10/h)
- [x] **Honeypot** `_hp` sur le formulaire de signalement (champ caché via `position:absolute;left:-9999px`, rejeté côté serveur s'il est rempli)
- [x] **Captcha Cloudflare Turnstile** sur `/register` et `/login` via le plugin Better Auth `captcha` ([auth.ts](src/server/auth/auth.ts)) + widget client ([TurnstileWidget](src/components/auth/turnstile-widget.tsx), sans dep npm, script vanilla de Cloudflare). Le plugin ajoute la vérification serveur sur `/sign-up/email`, `/sign-in/email` et `/request-password-reset`. Désactivé si `TURNSTILE_SECRET_KEY` absent (fallback dev). Cloudflare fournit des test keys "always passes" pour dev.
- [x] **Détection de doublons** de signalements par similarité textuelle : extension `pg_trgm` activée (migration `20260418160000_pg_trgm_extension`), `createReport` interroge `similarity(description)` des signalements actifs du même user/type < 30 jours, seuil > 0.6 bloque avec un message guidant vers résolution/édition de l'annonce existante. Perceptual hashing des images reporté en **phase 2** (nécessite sharp + lib pHash, gain marginal vs complexité pour le MVP).

---

## 4. SEO et acquisition organique

L'acquisition doit être organique pour être autosuffisante. Pas de budget pub.

### 4.1 SEO technique
- [x] Sitemap dynamique (`/sitemap.xml`) avec toutes les fiches chats, refuges et signalements actifs
- [x] Metadata OpenGraph par page (titre, description, image) sur fiches chats, signalements, refuges
- [x] Structured data JSON-LD sur les fiches chats (schema.org/Product + Offer)
- [x] Structured data sur les refuges (schema.org/AnimalShelter)
- [x] ISR sur les 3 pages détail : `/adopter/[id]` (SSG + revalidate 1h, `generateStaticParams` sur chats disponibles, FavoriteButton refactoré pour hydrater son état via `/api/favorites/[catId]`), `/refuges/[id]` (SSG + revalidate 1h, `generateStaticParams` sur tous les refuges), `/perdus-trouves/[id]` (dynamic + `unstable_cache` 5 min sur `getReportWithPhotos` avec tag invalidé par les actions)

### 4.2 Pages d'atterrissage géolocalisées
- [x] Pages `/adopter/ville/[slug]` pour 25 villes (Paris, Lyon, Marseille, Toulouse, Nice, Nantes, Strasbourg, Montpellier, Bordeaux, Lille, Rennes, Reims, Le Havre, Saint-Étienne, Toulon, Grenoble, Dijon, Angers, Nîmes, Villeurbanne, Clermont-Ferrand, Le Mans, Aix-en-Provence, Brest, Tours) — `generateStaticParams` + SSG
- [x] Contenu adapté : H1 "Chats à adopter {prep} {ville}", comptage des chats + refuges dans un rayon de 30 km via PostGIS `ST_DWithin`, liste des refuges triée par distance, grille de chats, nav vers autres villes
- [x] Index `/adopter/villes` avec compteur live par ville (revalidate 1h), Schema.org/CollectionPage + JSON-LD Place sur chaque fiche ville, canonical URL, sitemap.xml enrichi

### 4.3 Partage social
- [x] Bouton "Partager" sur les fiches signalement (`ReportShare`) et sur les fiches chat (`CatShare`) : Web Share API + fallback copie lien, 3 canaux sociaux (Facebook, WhatsApp, X) avec icônes de marque, + texte pré-formaté prêt à coller (groupes Facebook, SMS, WhatsApp…) avec lien de retour vers Dorloter pour créer un effet viral entrant
- [x] Image OpenGraph utilisant la photo principale (fiches chats, signalements, refuges) — déjà en place
- [x] Story-like : témoignage post-adoption via [TestimonialForm](src/components/cats/testimonial-form.tsx) (nouvelle table `testimonials`, form collapsible avec texte + photo optionnelle, accessible uniquement aux users dont la candidature est `acceptee`), affichage via [TestimonialDisplay](src/components/cats/testimonial-display.tsx) (bloc quote lavande sur la fiche chat, prénom + mois/année, photo "après adoption" si fournie). Rate-limit 10/h, upsert (l'adoptant peut éditer), modération via `unpublishTestimonial` accessible aux shelter_admin du refuge concerné et au platform_admin.

---

## 5. PWA et mobile

L'usage principal est mobile (signalements sur le terrain, consultation de fiches en déplacement).

### 5.1 PWA complète
- [x] Manifest typé Next.js avec icônes SVG (any + maskable), theme_color coral, 3 shortcuts
- [x] Service worker avec stratégie cache-first pour les assets, network-first pour les pages
- [x] Install prompt natif (bannière coral bottom-right, auto après 4s, dismiss persistant)
- [x] **Mode offline** : `<TrackVisit>` sur les 3 fiches détail persiste les visites en localStorage (20 max) et envoie `postMessage({type:"cache-urls"})` au SW qui les fetch+cache → accès offline. `OfflineIndicator` sticky en haut quand `navigator.onLine === false`. Composant `<RecentVisits>` réutilisable pour afficher l'historique.

### 5.2 UX mobile
- [x] Swipe sur les fiches chats (style Tinder) — deck motion/react avec drag, stamps, cartes empilées, défaut sur `/adopter`
- [x] **Bottom navigation bar mobile** ([BottomNav](src/components/layout/bottom-nav.tsx)) 5 tabs adaptés selon auth (Adopter / Signaler / Favoris / Alertes / Profil ou version anon), active state coral, safe-area iOS, masqué sur pages d'auth
- [x] **Appareil photo natif** sur le formulaire de signalement : deux tuiles distinctes "Prendre" (`capture="environment"`) + "Galerie" (file picker classique multiple)
- [x] Géolocalisation one-tap pour le formulaire de signalement — bouton "Utiliser ma position" dans le location-picker

---

## 6. Automatisation et maintenance autonome

Ce qui permet à l'app de tourner sans intervention quotidienne.

### 6.1 Jobs planifiés
Tous les endpoints protégés par `CRON_SECRET` (token via `?token=xxx` ou header `Authorization: Bearer xxx`). Helper partagé [lib/cron-auth.ts](src/lib/cron-auth.ts).
- [x] Expiration des signalements inactifs (> 60 jours) — `/api/cron/expire-reports`
- [x] Nettoyage des photos orphelines sur S3 — `/api/cron/cleanup-orphan-photos` (liste paginée S3 vs URLs référencées en base, garde-fou si < 10 clés en base)
- [x] Recalcul périodique des matchs perdu/trouvé — `/api/cron/refresh-matches` (itère sur tous les reports actifs)
- [x] Email de rappel aux refuges avec candidatures non traitées depuis 7 jours — `/api/cron/remind-pending-applications` (agrégation par refuge, email aux admins)
- [x] Purge des sessions Better Auth expirées en base — `/api/cron/purge-expired-sessions`

### 6.2 Monitoring
- [x] Health check endpoint `/api/health` : Postgres (SELECT 1) + S3 (HeadBucket) + latences, retourne 503 si KO
- [ ] Alertes email/webhook si le health check échoue — configuration externe : [UptimeRobot](https://uptimerobot.com) gratuit (50 monitors), pointer sur `https://dorloter.fr/api/health`, alerte si status ≠ 200
- [x] Logs structurés JSON via [lib/logger.ts](src/lib/logger.ts) — branché sur : `report.created`, `report.resolved`, `report.resolved_via_match`, `moderation.content_reported`, `moderation.resolved`, `shelter.created`, `shelter.verified`. Log level configurable via `LOG_LEVEL` env var.

### 6.3 Backups
- [x] Backup quotidien Postgres + volume MinIO via [scripts/backup.sh](scripts/backup.sh) : `pg_dump | gzip` + `tar` du volume, upload vers bucket S3 compatible (OVH Object Storage par défaut)
- [x] Rétention 7 derniers jours en local + rétention côté bucket via lifecycle rule configurée dans la console OVH (30 jours recommandés)
- [x] Restauration documentée : cron `0 3 * * * ./scripts/backup.sh`, restore = `gunzip db.sql.gz | psql` + `tar xf minio.tar -C /var/lib/docker/volumes/dorloter-prod_miniodata/_data`

---

## 7. Monétisation douce (couvrir les coûts)

L'objectif n'est pas le profit mais l'autosuffisance. Coûts estimés : VPS 10-20€/mois + S3 < 5€/mois.

### 7.1 Dons
- [ ] Page "Soutenir Dorloter" avec lien vers un pot commun (Ko-fi, Tipeee, ou Stripe direct)
- [ ] Bannière discrète en bas de page "Dorloter est gratuit et sans pub. Soutenez-nous."

### 7.2 Refuges premium (optionnel, à évaluer)
- [ ] Mise en avant des fiches (badge "Coup de coeur" en haut du catalogue) - 5€/mois par refuge
- [ ] Stats avancées (provenance des vues, taux de conversion fiche → candidature)
- [ ] Export CSV des candidatures

### 7.3 Partenariats
- [ ] Encart partenaire discret (assurance animale, alimentation, vétérinaire) avec lien affilié
- [ ] Uniquement dans une section dédiée, jamais dans le flow d'adoption

---

## 8. Infra et déploiement

### 8.1 CI/CD
- [x] GitHub Actions : lint + typecheck + audit + docker build sur chaque PR — [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [x] Build Docker de l'app Next.js — [Dockerfile](Dockerfile) multi-stage Bun + Next standalone
- [x] Déploiement auto sur le VPS à chaque push sur `main` via SSH — [.github/workflows/deploy.yml](.github/workflows/deploy.yml) + [scripts/deploy.sh](scripts/deploy.sh)
- [x] Migration de base auto au déploiement — `docker compose run --rm app bun x drizzle-kit migrate` dans deploy.sh, avec re-application des grants PG

### 8.2 Production
Stack et runbook livrés dans [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Le provisioning du VPS et l'achat du domaine sont des étapes manuelles (non-code).
- [x] VPS Hetzner ou OVH (souveraineté EU) — choix et guide dans le runbook
- [x] PostgreSQL self-hosted avec PostGIS — `postgis/postgis:18-3.6` dans [docker-compose.prod.yml](docker-compose.prod.yml)
- [x] Object Storage self-hosted (MinIO) avec backup vers OVH Object Storage via [scripts/backup.sh](scripts/backup.sh) — la migration vers Scaleway/OVH direct se fait en changeant 5 env vars
- [x] Reverse proxy Caddy avec HTTPS Let's Encrypt auto — [Caddyfile](Caddyfile)
- [x] Nom de domaine configuré (DNS A records `dorloter.fr` + `cdn.dorloter.fr` documentés)

### 8.3 Sécurité
- [x] Headers de sécurité via [next.config.ts](next.config.ts) : CSP stricte (scripts/styles/img/connect séparés par domaine), HSTS max-age 1 an, X-Content-Type-Options, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin, Permissions-Policy (camera/geo autorisés pour l'app)
- [x] Rate limiting par IP sur les routes sensibles (`createReport` 5/h, `createApplication` 10/h, `reportContent` 20/h, `importReportFromUrl` 10/h) — [lib/rate-limit.ts](src/lib/rate-limit.ts)
- [x] Audit des dépendances (`bun audit --prod`) dans la CI — étape non-bloquante pour signaler sans bloquer les merges
- [x] Variables d'environnement en secrets : `.env.production` jamais commit (dans `.gitignore`), secrets GitHub Actions pour SSH/VPS, `CRON_SECRET` pour les endpoints cron, rotation documentée dans [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

**Bonus défense-en-profondeur livré au-delà de la roadmap** :
- 3 rôles PG distincts (`dorloter_app` / `dorloter_admin` / superuser migrations) avec grants column-level sur `users.role`, `shelters.is_verified` etc. — voir [scripts/init-db-roles.sql](scripts/init-db-roles.sql). Une Server Action compromise ne peut pas escalader un rôle au niveau driver Postgres.

---

## 9. Légal et conformité

### 9.1 RGPD
- [x] Page mentions légales — [/mentions-legales](src/app/(public)/mentions-legales/page.tsx) (LCEN art. 6-III : éditeur, hébergeur OVH, contenus utilisateurs)
- [x] Page politique de confidentialité — [/confidentialite](src/app/(public)/confidentialite/page.tsx) (RGPD art. 13/14 : tableau finalités/bases légales/durées, destinataires, droits, sécurité)
- [x] Pas de cookies tiers : mention visible en footer, pas de bandeau nécessaire (la jurisprudence CNIL dispense les cookies techniques strictement nécessaires de consentement préalable)
- [x] Export des données personnelles (art. 15/20 RGPD) : `/api/profile/export` renvoie un JSON attaché avec toutes les données user (profil, reports+photos, applications, favorites, follows, notifications, sessions, content reports, resolution credits, shelter si admin). Bouton "Télécharger mes données" dans [/profil](src/components/profile/data-export.tsx).
- [x] Suppression de compte avec purge cascade (déjà livré)
- [x] Base de données hébergée en UE — couvert par §8.2 (OVH Roubaix dans le stack Docker prod)

### 9.2 CGU
- [x] Conditions générales d'utilisation — [/cgu](src/app/(public)/cgu/page.tsx) (10 sections : objet, acceptation, gratuité, inscription, règles de publication, modération, responsabilité intermédiaire technique LCEN, disponibilité, résiliation, droit applicable)
- [x] Charte des refuges partenaires — [/charte-refuges](src/app/(public)/charte-refuges/page.tsx) (8 engagements : légitimité juridique, soins vétérinaires, honnêteté des annonces, processus d'adoption, frais proportionnés, non-discrimination, suivi post-adoption, sanctions)

> ⚠️ **À faire avant lancement public** : relecture par un conseil juridique pour adapter au statut précis (entreprise individuelle / association / société), compléter les crochets `[...]` (nom, adresse, SIRET), et ajuster les délais/montants selon les pratiques réelles.

---

## 10. Messagerie temps réel particuliers ↔ refuges

Design complet : [docs/MESSAGING.md](docs/MESSAGING.md).

- [x] **Server-Sent Events (SSE)** sur `/api/messages/stream?conversationId=X` avec heartbeat 30s, reconnect natif via `EventSource`, fallback polling `/api/messages/poll?since=...` si SSE échoue 3× d'affilée
- [x] **Event bus in-process** ([src/server/messaging/bus.ts](src/server/messaging/bus.ts)) avec tracking de la presence (streams SSE actifs par conversation × user) pour éviter le double push quand le destinataire est en ligne
- [x] **Schéma DB** : 3 tables `conversations` / `messages` / `message_reactions` avec unique `(user, shelter, cat)` pour éviter la fragmentation de contextes, grants PG column-level cohérents avec §8.3
- [x] **Server Actions** ([src/server/actions/messaging.ts](src/server/actions/messaging.ts)) : `openConversation`, `sendMessage`, `editMessage` (fenêtre 5 min), `toggleReaction`, `markConversationRead`, `setTyping`, `archiveConversation`. Tous rate-limités, auth-guardés, publient sur le bus
- [x] **Réactions emoji** : whitelist 10 emojis (🙏 ❤️ 👍 👎 😂 😢 🎉 🐾 🔥 ✅), toggle natif via `ON CONFLICT DO DELETE`, agrégation broadcastée en live
- [x] **Accusés de lecture** : ticks gris/bleu dans la bulle (à la Slack), broadcast SSE du timestamp au sender dès que le destinataire ouvre le thread
- [x] **Typing indicator** : 3 dots animés, debounce client (max 1×/3s), TTL 3s
- [x] **Presence** : bordure verte "En ligne" quand le pair a au moins un stream SSE actif
- [x] **UI thread** : bulles, composer auto-resize, Ctrl+Entrée pour envoyer, picker emoji au survol, honeypot anti-bot
- [x] **Pages** : `/messages` + `/messages/[id]` (user), `/shelter-messages` + `/shelter-messages/[id]` (refuge) — layouts existants étendus
- [x] **Entry points** : `ContactShelterButton` sur fiches chat + refuges, préfill contextuel si on part d'un chat précis
- [x] **Badge unread** dans la navbar ([MessagesNavLink](src/components/messaging/messages-nav-link.tsx)), refresh 60s via `/api/messages/unread-count`
- [x] **Fanout notifications** intelligent : push + in-app à chaque message, email uniquement sur le 1er contact ou reprise après silence >24h, skip push si destinataire a un SSE actif
- [x] **Export RGPD** : conversations + messages envoyés + réactions inclus dans `/api/profile/export`
- [x] **Caddyfile** : `flush_interval -1` sur `/api/messages/stream` pour désactiver le buffering proxy et garantir le stream en temps réel
- [x] **Bottom-nav mobile** : tab Messages avec badge unread (remplace Favoris qui reste accessible via /profil)
- [x] **Purge RGPD** : cron `/api/cron/purge-stale-conversations` supprime les conversations sans activité depuis 18 mois (cascade DELETE sur messages + reactions via FK)

**Scalabilité** : single-process Node tient 5-10k connexions SSE concurrentes. Pour scaler horizontalement, remplacer l'event bus par Redis pub/sub (même API — migration reportée en phase 2).

---

## Ordre de priorité suggéré

| Priorité | Bloc | Pourquoi |
|----------|------|----------|
| **P0** | 1.1 Perdus/Trouvés | C'est le différenciateur de Dorloter, sans ça c'est juste un catalogue |
| **P0** | 1.2 Candidatures | Sans ça les refuges ne voient pas l'intérêt |
| **P1** | 2.1 + 2.2 Notifications | Rétention des utilisateurs |
| **P1** | 1.3 Profil + 1.4 Refuge complet | Finaliser le socle |
| **P1** | 8.1 + 8.2 CI/CD + déploiement | Mettre en ligne |
| **P2** | 4 SEO | Acquisition organique |
| **P2** | 3 Modération | Nécessaire avant d'ouvrir au public |
| **P2** | 5 PWA | Usage mobile terrain |
| **P3** | 6 Automatisation | Maintenance long terme |
| **P3** | 7 Monétisation | Quand il y a du trafic |
| **P3** | 9 Légal | Avant le lancement public officiel |
