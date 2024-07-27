# Configuration des variables d'environnement

Guide pas-à-pas pour remplir `.env.local` (dev) et `.env.production` (prod).

## TL;DR

### Dev

```bash
cp .env.local.example .env.local
# Générer le secret Better Auth :
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
# (Optionnel) Générer les clés VAPID pour les Web Push :
bun x web-push generate-vapid-keys
# Puis coller dans .env.local

docker compose up -d
bun db:migrate
bun db:init-roles
bun db:seed
bun dev
```

### Prod

```bash
cp .env.production.example .env.production
# Remplir TOUS les __REPLACE_*__ ci-dessous
bun prod:build
bun prod:up
bun prod:migrate
bun prod:init-roles
```

---

## Variables par section

### 1. Postgres — 3 connexions

Le projet utilise trois rôles Postgres distincts pour la défense en profondeur (voir [scripts/init-db-roles.sql](../scripts/init-db-roles.sql)).

| Variable | Dev | Prod | Rôle |
|---|---|---|---|
| `DATABASE_URL` | `miaou_app:miaou_app@localhost:5438` | `miaou_app:<pass>@postgres:5432` | App publique (CRUD restreint : pas d'UPDATE sur `users.role`, `shelters.is_verified`, etc.) |
| `DATABASE_URL_ADMIN` | `miaou_admin:miaou_admin@localhost:5438` | `miaou_admin:<pass>@postgres:5432` | Server Actions platform_admin (écritures privilégiées) |
| `DATABASE_URL_MIGRATIONS` | `miaou:miaou@localhost:5438` | `miaou:<pass>@postgres:5432` | Superuser — migrations Drizzle uniquement |

Générer les mots de passe prod :

```bash
openssl rand -base64 24    # POSTGRES_SUPERUSER_PASSWORD
openssl rand -base64 24    # MIAOU_APP_PASSWORD
openssl rand -base64 24    # MIAOU_ADMIN_PASSWORD
```

> En prod, les `miaou_app` / `miaou_admin` sont créés par `bun prod:init-roles` qui lit ces variables et les applique via `ALTER ROLE`.

### 2. Better Auth

| Variable | Obligatoire | Comment |
|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | ✅ | `http://localhost:3000` en dev, `https://dorloter.fr` en prod |
| `NEXT_PUBLIC_APP_URL` | ✅ | Même valeur que `BETTER_AUTH_URL` |

### 3. Object Storage (photos)

En dev, MinIO local sert de S3. En prod, MinIO auto-hébergé sur le même VPS, exposé via Caddy sur `cdn.{DOMAIN}`.

| Variable | Dev | Prod |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | *(non défini, géré par le compose : `http://minio:9000`)* |
| `S3_ACCESS_KEY` | `minioadmin` | `openssl rand -hex 12` |
| `S3_SECRET_KEY` | `minioadmin` | `openssl rand -hex 24` |
| `S3_BUCKET` | `miaou-photos` | `miaou-photos` |
| `S3_PUBLIC_URL` | `http://localhost:9000/miaou-photos` | *(géré par le compose : `https://cdn.dorloter.fr/miaou-photos`)* |

### 4. Cartographie — MapTiler

1. Créer un compte gratuit sur [maptiler.com](https://www.maptiler.com/) (100k loads/mois inclus)
2. Account → API Keys → copier la clé
3. Remplir :

```env
NEXT_PUBLIC_MAPTILER_KEY=abcdef123456
```

### 5. Web Push (notifications)

```bash
bun x web-push generate-vapid-keys
```

Sortie :

```
Public Key:
BJWobgG8e6vLuoyKAjbxa2Te7USrMcx0HkRhPv2Bwbmphuij51PQTlHi4FeokfZBVy-...
Private Key:
cXEZjCrb5J0kNtsGXFyVvuu-XoFTmBQ7s6q3WNPtg5U
```

```env
VAPID_PUBLIC_KEY=BJWobgG8...
VAPID_PRIVATE_KEY=cXEZjCrb...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BJWobgG8...    # même valeur que VAPID_PUBLIC_KEY
VAPID_SUBJECT=mailto:noreply@dorloter.fr
```

> Sans ces clés, les notifs push sont désactivées côté client (dégradation propre, pas d'erreur).

### 6. Emails — Resend

1. Créer un compte sur [resend.com](https://resend.com) (3k emails/mois, 100/jour gratuits)
2. Domains → ajouter `dorloter.fr` → suivre les DNS records (SPF + DKIM)
3. API Keys → créer une clé

```env
RESEND_API_KEY=re_123abc...
RESEND_FROM_EMAIL=Dorloter <noreply@dorloter.fr>
```

> Sans `RESEND_API_KEY`, les emails sont loggés dans la console (mode dev friendly).

### 7. Backup S3 (prod uniquement)

Cible par défaut : OVH Object Storage (bucket Standard ou Cold Archive).

1. Console OVH → Public Cloud → Object Storage → créer un bucket `miaou-backups`
2. Users & Roles → créer un user → S3 credentials → copier access key + secret
3. Remplir `.env.production` :

```env
S3_BACKUP_ENDPOINT=https://s3.gra.io.cloud.ovh.net
S3_BACKUP_REGION=gra
S3_BACKUP_BUCKET=miaou-backups
S3_BACKUP_ACCESS_KEY=...
S3_BACKUP_SECRET_KEY=...
```

| Provider | Endpoint |
|---|---|
| OVH Gravelines (Standard) | `https://s3.gra.io.cloud.ovh.net` |
| OVH Strasbourg | `https://s3.sbg.io.cloud.ovh.net` |
| Scaleway Paris | `https://s3.fr-par.scw.cloud` |
| Cloudflare R2 | `https://<account>.r2.cloudflarestorage.com` |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` |

> Si ces vars sont vides, le backup ne fait que le dump local dans `./backups/` (utile en dev).

### 8. Domaine (prod uniquement)

| Variable | Exemple |
|---|---|
| `DOMAIN` | `dorloter.fr` |
| `ACME_EMAIL` | `admin@dorloter.fr` (pour Let's Encrypt) |

Pré-requis DNS (zone du domaine chez OVH/Gandi/Cloudflare) :

```
dorloter.fr      A    <IP publique du VPS>
cdn.dorloter.fr  A    <IP publique du VPS>
```

Caddy obtient les certificats automatiquement au premier hit HTTPS.

---

## Checklist pré-déploiement prod

- [ ] VPS provisionné, SSH configuré
- [ ] DNS `A` records posés pour `dorloter.fr` et `cdn.dorloter.fr`
- [ ] `.env.production` rempli — aucun `__REPLACE_*__` restant
- [ ] `BETTER_AUTH_SECRET` généré (`openssl rand -base64 32`)
- [ ] 3 mots de passe PG distincts, forts, différents
- [ ] `S3_ACCESS_KEY` / `S3_SECRET_KEY` MinIO générés (ne PAS utiliser `minioadmin`)
- [ ] Clés VAPID générées (`bun x web-push generate-vapid-keys`)
- [ ] MapTiler : clé API récupérée
- [ ] Resend : domaine vérifié + clé API
- [ ] OVH Object Storage : bucket créé + credentials S3
- [ ] `bun prod:build` réussi
- [ ] `bun prod:up && bun prod:migrate && bun prod:init-roles`
- [ ] Cron backup posé (`crontab -e`)
- [ ] Ouvrir `https://dorloter.fr` — certificat vert, landing page chargée
- [ ] Créer un compte test + vérifier la réception email
- [ ] Se connecter en admin plateforme — accéder à `/admin`

---

## Génération rapide de tous les secrets

```bash
cat <<EOF
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_SUPERUSER_PASSWORD=$(openssl rand -base64 24)
MIAOU_APP_PASSWORD=$(openssl rand -base64 24)
MIAOU_ADMIN_PASSWORD=$(openssl rand -base64 24)
S3_ACCESS_KEY=$(openssl rand -hex 12)
S3_SECRET_KEY=$(openssl rand -hex 24)
EOF
```

Copier-coller dans `.env.production`, puis ajouter manuellement VAPID, MapTiler, Resend, S3 backup.
