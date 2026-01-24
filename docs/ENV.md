# Configuration des variables d'environnement

Stack en vigueur : **API NestJS** (`apps/api`, Kysely + PostGIS, auth **JWT**), **front public** (`apps/web`), **espace pro** (`apps/pro`), **mobile Expo** (`apps/mobile`). En dev, les défauts sont dans le code (`apps/api/src/config.ts`) ; en prod, tout passe par `.env.production` (voir `.env.production.example`). Les noms de variables gardent la convention historique (`ConnectionStrings__*`, `Dorloter__*`) : ils sont restés identiques à travers les réécritures successives du backend, pour ne rien changer côté infra.

## TL;DR

### Dev

```bash
docker compose up -d                          # Postgres/PostGIS (:5438) + MinIO
cd apps/api && bun dev                        # migre le schéma au démarrage
bun db:seed                                   # données de test (idempotent)
cd apps/web && bun dev                        # vitrine    :5173
cd apps/pro && bun dev                        # espace pro :5174
```

En dev, aucun secret n'est requis : `config.ts` fournit des valeurs locales par défaut (DB `dorloter`, secret JWT de dev, email no-op loggé).

### Prod

```bash
cp .env.production.example .env.production     # remplir tous les __REPLACE_*__
bun prod:init-roles                            # crée/rote les rôles PG dorloter_app / dorloter_admin
bun prod:build && bun prod:up                  # build + démarre la stack (l'API migre au démarrage)
```

Pas d'étape de migration séparée : l'API applique ses migrations SQL au démarrage (migrateur maison), via la connexion DDL dédiée `ConnectionStrings__Migrations` si fournie.

---

## Variables par section

### 1. Postgres

L'app utilise des rôles à privilèges restreints (défense en profondeur, voir [scripts/init-db-roles.sql](../scripts/init-db-roles.sql)).

| Variable | Rôle |
|---|---|
| `POSTGRES_SUPERUSER` / `POSTGRES_SUPERUSER_PASSWORD` | superuser · migrations (DDL) + création des rôles |
| `DORLOTER_APP_PASSWORD` | mot de passe du rôle applicatif `dorloter_app` (CRUD restreint) |
| `DORLOTER_ADMIN_PASSWORD` | mot de passe du rôle `dorloter_admin` (écritures privilégiées) |

Côté API, la connexion est construite par le compose :
- `ConnectionStrings__Default` : rôle `dorloter_app` (search_path `dorloter_api,public`)
- `ConnectionStrings__Migrations` : rôle DDL (superuser) · optionnel, sinon `Default` est utilisé

### 2. Authentification (JWT)

| Variable | Comment |
|---|---|
| `API_JWT_SECRET` (compose → `Dorloter__Security__Jwt__Secret`) | >= 32 octets, `openssl rand -base64 48` |
| `Dorloter__Security__Jwt__Issuer` | `dorloter-api` |
| `Dorloter__Security__CorsAllowedOrigins` | origines front, ex. `https://dorloter.fr,https://pro.dorloter.fr` |

### 3. Object storage (photos)

MinIO en dev et en prod (auto-hébergé, exposé via Caddy sur `cdn.{DOMAIN}`).

| Variable | Dev | Prod |
|---|---|---|
| `S3_ACCESS_KEY` | `minioadmin` | `openssl rand -hex 12` |
| `S3_SECRET_KEY` | `minioadmin` | `openssl rand -hex 24` |
| `S3_BUCKET` | `dorloter-photos` | `dorloter-photos` |

> Le presign d'upload n'est pas encore porté sur l'API (gap connu, voir docs/ARCHITECTURE.md).

### 4. Cartographie (fronts)

| Variable | Comment |
|---|---|
| `VITE_MAP_STYLE` | URL d'un style MapLibre · optionnel (sans valeur, OpenFreeMap est utilisé sans clé) |

### 5. Email transactionnel (SMTP)

Provider-agnostique (transport SMTP à brancher · émetteur actuellement no-op loggé). Recommandé : **Brevo** (français, offre gratuite ~300 mails/jour). Voir [EMAIL.md](EMAIL.md).

```env
EMAIL_SMTP_HOST=smtp-relay.brevo.com    # vide = envoi désactivé (loggé)
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=<login SMTP Brevo>
EMAIL_SMTP_PASSWORD=<clé SMTP Brevo>
EMAIL_FROM=no-reply@dorloter.fr
EMAIL_FROM_NAME=Dorloter
```

Une fois le transport branché, le compose mappera ces variables vers `Dorloter__Email__Host/Port/User/Password/FromEmail/FromName`. Swappable vers OVH / Scaleway TEM / Postfix sans changer le code.

> Web Push (VAPID) : pas encore porté sur l'API (gap).

### 6. Backup S3 (prod)

Cible par défaut : OVH Object Storage (France).

```env
S3_BACKUP_ENDPOINT=https://s3.gra.io.cloud.ovh.net
S3_BACKUP_REGION=gra
S3_BACKUP_BUCKET=dorloter-backups
S3_BACKUP_ACCESS_KEY=...
S3_BACKUP_SECRET_KEY=...
```

| Provider | Endpoint |
|---|---|
| OVH Gravelines | `https://s3.gra.io.cloud.ovh.net` |
| Scaleway Paris | `https://s3.fr-par.scw.cloud` |

> Vides : le backup ne fait que le dump local dans `./backups/`.

### 7. Domaine (prod)

| Variable | Exemple |
|---|---|
| `DOMAIN` | `dorloter.fr` |
| `ACME_EMAIL` | `admin@dorloter.fr` (Let's Encrypt) |

DNS (zone du domaine) :

```
dorloter.fr        A   <IP publique du VPS>
pro.dorloter.fr    A   <IP publique du VPS>
cdn.dorloter.fr    A   <IP publique du VPS>
```

Caddy obtient les certificats automatiquement au premier hit HTTPS.

---

## Génération rapide des secrets prod

```bash
cat <<EOF
API_JWT_SECRET=$(openssl rand -base64 48)
POSTGRES_SUPERUSER_PASSWORD=$(openssl rand -base64 24)
DORLOTER_APP_PASSWORD=$(openssl rand -base64 24)
DORLOTER_ADMIN_PASSWORD=$(openssl rand -base64 24)
S3_ACCESS_KEY=$(openssl rand -hex 12)
S3_SECRET_KEY=$(openssl rand -hex 24)
EOF
```

Compléter ensuite : `DOMAIN`, `ACME_EMAIL`, les variables `EMAIL_SMTP_*` (Brevo) et `S3_BACKUP_*`.

## Checklist pré-déploiement prod

- [ ] VPS provisionné (France : OVH/Scaleway), SSH configuré
- [ ] DNS `A` posés : `dorloter.fr`, `pro.dorloter.fr`, `cdn.dorloter.fr`
- [ ] `.env.production` rempli (aucun `__REPLACE_*__` restant)
- [ ] `API_JWT_SECRET` généré, mots de passe PG distincts et forts
- [ ] `S3_ACCESS_KEY` / `S3_SECRET_KEY` MinIO générés (pas `minioadmin`)
- [ ] Email : compte Brevo + clé SMTP (sinon emails seulement loggés)
- [ ] Backup : bucket OVH/Scaleway + credentials
- [ ] `bun prod:init-roles` puis `bun prod:build && bun prod:up`
- [ ] `https://dorloter.fr` et `https://pro.dorloter.fr` répondent (certificats OK)
- [ ] Cron backup posé
