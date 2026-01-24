# Déploiement Dorloter en production

Guide complet pour passer de rien à une prod qui tourne, puis pour la maintenir au quotidien.

> **Stack cible** : **Caddy** (TLS edge) sert deux SPA React/Vite statiques (`apps/web`,
> la vitrine publique adoptants, sur le domaine ; `apps/pro`, l'espace pro refuge/pension/véto,
> sur `pro.${DOMAIN}`) et proxifie `/api/v1/*` vers l'**API NestJS** (`apps/api`, Kysely + PostGIS).
> S'y ajoutent **Postgres/PostGIS** et **MinIO** (object storage images, exposé en CDN sur
> `cdn.${DOMAIN}`). Le tout dans un seul `docker-compose.prod.yml` (projet compose `dorloter-prod`).
> L'auth est en **JWT** ; les migrations de schéma sont des fichiers SQL embarqués dans l'API,
> appliqués au démarrage par le migrateur maison (pas d'étape de migration séparée). Source de
> vérité du stack : **[CLAUDE.md](../CLAUDE.md)**.

## 0. Ce qui est déjà prêt côté code

Avant de commencer, l'app est livrée avec :

- **Dockerfiles** : API NestJS (`apps/api/Dockerfile`, `nest build`, image runtime node-slim non-root), SPA publique (`apps/web/Dockerfile`, `vite build` servi par un Caddy interne) et SPA pro (`apps/pro/Dockerfile`, idem)
- **docker-compose.prod.yml** (unique) : `postgres` (PostGIS) + `minio` (+ `minio-init`) + `api` (NestJS) + `web` (SPA publique) + `pro` (SPA espace pro) + `caddy` (edge TLS)
- **Caddyfile** : reverse proxy + HTTPS Let's Encrypt auto ; sert `web` sur le domaine, `pro` sur `pro.${DOMAIN}`, proxifie `/api/v1/*` vers `api:8080`, expose MinIO en CDN sur `cdn.${DOMAIN}`
- **scripts/deploy.sh** : déploiement idempotent (build `web` + `pro` + `api`, init des rôles PG, recreate)
- **scripts/prod-init-roles.sh** : création/rotation des rôles PG `dorloter_app` / `dorloter_admin`
- **scripts/backup.sh** : backup quotidien PG + MinIO vers un bucket S3-compatible
- **[.github/workflows/ci.yml](../.github/workflows/ci.yml)** + **[api-ci.yml](../.github/workflows/api-ci.yml)** (API : typecheck + build + test + docker build) : build + tests sur chaque PR
- **[.github/workflows/deploy.yml](../.github/workflows/deploy.yml)** : déploiement auto à chaque push sur `main` (SSH vers le VPS, `scripts/deploy.sh`)
- Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) servis par Caddy
- `/api/v1/health` pour le monitoring externe (réponse `{"status":"UP"}`)

> **Endpoints pas encore portés** : `/api/v1/uploads/*` et `/api/v1/gifs/*` répondent `501 Not Implemented`
> via Caddy (ils étaient servis par l'ancien front Next.js, retiré). L'upload S3 (presign) sera porté
> sur l'API ; aujourd'hui la SPA web n'en dépend pas.

## 1. Provisioning VPS

**Hébergement** : VPS européen, France privilégiée (souveraineté · cf. CLAUDE.md).
Recommandé : **OVH** (Gravelines, FR) VLE-4 (2 vCPU, 4 Go RAM, 80 Go NVMe) à ~7€/mois,
ou **Scaleway** (Paris, FR). Alternative : Hetzner CX22 (Allemagne, ~4€/mois).

### Commander le VPS

1. Console OVH ou Scaleway → créer un VPS / instance
2. Image : **Ubuntu 24.04 LTS**
3. Ajouter votre clé SSH pendant la création
4. Attendre ~2 min, noter l'IP publique

### DNS

Dans la zone DNS de votre domaine (OVH, Gandi, Cloudflare…) :

```
dorloter.fr      A    <IP du VPS>
pro.dorloter.fr  A    <IP du VPS>
cdn.dorloter.fr  A    <IP du VPS>
```

TTL 300s. Propagation DNS < 10 min en général.

> Le sous-domaine `console.dorloter.fr` (console d'admin MinIO) est optionnel : ajoutez-le
> seulement si vous exposez la console MinIO (`MINIO_BROWSER_REDIRECT_URL`).

### Hardening initial du VPS

```bash
ssh root@<IP>   # ou ubuntu@ selon l'image

# Créer un user deploy non-root
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Sudo sans mot de passe pour deploy (optionnel mais pratique pour CI/CD)
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

# Désactiver le login root SSH + mot de passe
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Firewall : 22, 80, 443
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Se reconnecter en tant que deploy
exit
ssh deploy@<IP>

# Docker + docker compose plugin v2
sudo apt update
sudo apt install -y docker.io docker-compose-plugin rsync curl git
sudo usermod -aG docker deploy
newgrp docker
docker --version && docker compose version
```

## 2. Setup initial de l'app

### Cloner le repo

```bash
sudo mkdir -p /opt/dorloter
sudo chown deploy:deploy /opt/dorloter
git clone https://github.com/<votre-org>/dorloter.git /opt/dorloter
cd /opt/dorloter
```

### Installer Bun (requis pour les scripts `prod:*`, pas pour le runtime)

Les images Docker buildent tout en interne (`nest build`, `vite build`) ; Bun ne sert qu'aux
scripts d'orchestration (`bun prod:*`).

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Configurer `.env.production`

```bash
cp .env.production.example .env.production
```

Voir **[docs/ENV.md](./ENV.md)** pour le détail de chaque variable. Générer les secrets aléatoires :

```bash
cat <<EOF >> .env.production
API_JWT_SECRET=$(openssl rand -base64 48)
POSTGRES_SUPERUSER_PASSWORD=$(openssl rand -base64 24)
DORLOTER_APP_PASSWORD=$(openssl rand -base64 24)
DORLOTER_ADMIN_PASSWORD=$(openssl rand -base64 24)
S3_ACCESS_KEY=$(openssl rand -hex 12)
S3_SECRET_KEY=$(openssl rand -hex 24)
EOF
```

Puis éditer à la main :
- `DOMAIN`, `ACME_EMAIL`
- `VITE_MAP_STYLE` (front · optionnel, sans valeur OpenFreeMap est utilisé sans clé)
- Email SMTP transactionnel : `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME` (Brevo recommandé : `smtp-relay.brevo.com:587`). Laisser `EMAIL_SMTP_HOST` vide désactive l'envoi (emails loggés).
- `S3_BACKUP_*` (bucket OVH ou équivalent)

### Premier déploiement

La première fois, créer les rôles PG après avoir démarré Postgres, puis lancer le reste :

```bash
cd /opt/dorloter
./scripts/deploy.sh
```

`scripts/deploy.sh` est idempotent et fait tout le travail : build des images `web` + `pro` + `api`,
démarrage de `postgres` + `minio`, attente que PG réponde, application des grants PG via
`scripts/prod-init-roles.sh`, puis recreate de `web` + `pro` + `api` + `caddy`. L'API applique
ses migrations SQL au démarrage (migrateur maison, connexion DDL dédiée).

Caddy obtient automatiquement les certificats Let's Encrypt au premier hit HTTPS. Attendre ~10s puis tester :

```bash
curl -s https://dorloter.fr/api/v1/health
# {"status":"UP"}
```

Vérifier aussi l'espace pro :

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://pro.dorloter.fr/
# 200
```

### Cron de backup

```bash
sudo crontab -e
```

Ajouter :

```cron
# Dorloter · backup quotidien à 2h du matin
0 2 * * *   cd /opt/dorloter && ./scripts/backup.sh >> /var/log/dorloter-backup.log 2>&1
```

> Pas de cron applicatif côté API pour l'instant (les anciens jobs cron étaient portés par le front
> Next.js retiré). À reloger sur l'API le moment venu : expiration des signalements, recalcul
> des matches, digests email.

### Monitoring externe

Uptime-check gratuit (pour être alerté si le site tombe) :

1. Compte sur [uptimerobot.com](https://uptimerobot.com) (50 monitors gratuits)
2. Add monitor → HTTP(s) → URL `https://dorloter.fr/api/v1/health` → check every 5 min
3. Alert contact = votre email
4. Optionnel : monitors supplémentaires sur `https://dorloter.fr/` (vitrine) et `https://pro.dorloter.fr/` (espace pro)

## 3. CI/CD (déploiement auto depuis GitHub)

### Secrets GitHub à configurer

Dans `Settings → Secrets and variables → Actions` du repo :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP publique ou nom DNS du VPS (ex. `dorloter.fr`) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Clé SSH **privée** (ed25519) autorisée sur le VPS · voir ci-dessous |
| `VPS_SSH_PORT` | (optionnel) si différent de 22 |

### Générer la clé SSH de déploiement

Sur votre machine locale :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/dorloter_deploy -C "github-actions-deploy" -N ""
```

Ajouter la **clé publique** (`~/.ssh/dorloter_deploy.pub`) dans `/home/deploy/.ssh/authorized_keys` sur le VPS.

Copier le contenu de la **clé privée** (`~/.ssh/dorloter_deploy`) dans le secret GitHub `VPS_SSH_KEY`.

### Workflow

Une fois les secrets en place, chaque `git push origin main` déclenche `.github/workflows/deploy.yml` qui :

1. SSHes sur le VPS
2. `git fetch` + `git reset --hard origin/main`
3. Exécute `scripts/deploy.sh` qui rebuild les images, applique les grants PG et relance les containers (l'API migre le schéma au démarrage)

Durée typique : 2-4 minutes. Pendant le build, le site reste up (les anciens containers tournent). Bascule quasi-instantanée en fin.

## 4. Maintenance au quotidien

### Logs

```bash
# Tous les services
bun prod:logs

# Un seul (api, web, pro, postgres, minio, caddy)
docker compose -f docker-compose.prod.yml logs -f api
```

### Backup manuel

```bash
./scripts/backup.sh        # ou : bun prod:backup
```

Les backups sont dans `./backups/` en local (7 derniers jours) et sur le bucket S3 (rétention configurée côté provider, 30 jours recommandés). Le script dump PG (gzip) + archive le volume MinIO en tar, puis upload S3 via `amazon/aws-cli` en container.

### Restauration

```bash
# Stop la stack
bun prod:down

# Postgres
cd /opt/dorloter/backups/20260418-030000  # ou le backup désiré
gunzip -c db.sql.gz | docker compose -f ../../docker-compose.prod.yml exec -T postgres psql -U dorloter -d dorloter

# MinIO
docker run --rm \
  -v dorloter-prod_miniodata:/data \
  -v "$(pwd):/backup:ro" \
  alpine:3 tar xf /backup/minio.tar -C /data

# Restart
bun prod:up
```

### Rotation des mots de passe PG

Après avoir changé `DORLOTER_APP_PASSWORD` / `DORLOTER_ADMIN_PASSWORD` dans `.env.production` :

```bash
bun prod:init-roles                    # applique les grants + ALTER ROLE ... PASSWORD
docker compose -f docker-compose.prod.yml up -d --force-recreate api
```

> `scripts/prod-init-roles.sh` est aussi à rejouer après une migration qui ajoute une colonne à
> `users` ou `shelters`, pour que les grants column-level couvrent les nouvelles colonnes.

### Mise à jour d'une dépendance

Sur votre machine locale :

```bash
bun update <package>
# tester en local
bun typecheck && bun dev
git commit -am "chore: bump <package>"
git push                               # CI/CD prend le relais
```

### Rollback rapide

```bash
ssh deploy@dorloter.fr
cd /opt/dorloter
git log --oneline -n 10                # identifier le commit stable précédent
git reset --hard <sha>
./scripts/deploy.sh
```

### Regarder l'état actuel

```bash
# Containers up + ressources
docker compose -f docker-compose.prod.yml ps
docker stats --no-stream

# Disque
df -h /var/lib/docker
du -sh /opt/dorloter/backups

# Health API
curl -s https://dorloter.fr/api/v1/health
```

## 5. Incident : que faire si...

| Symptôme | Commande de diag | Fix probable |
|---|---|---|
| Vitrine renvoie 502/503 | `docker compose -f docker-compose.prod.yml logs api \| tail -50` | `docker compose -f docker-compose.prod.yml up -d --force-recreate api` |
| Espace pro inaccessible | `docker compose -f docker-compose.prod.yml logs pro caddy` | Vérifier le DNS `pro.${DOMAIN}` + recreate `pro` + `caddy` |
| Certificat TLS expiré | `docker compose -f docker-compose.prod.yml logs caddy \| grep -i error` | Vérifier que le port 80 est ouvert (ACME HTTP-01) + DNS des 3 sous-domaines |
| DB pleine | `docker compose -f docker-compose.prod.yml exec postgres df -h` | Purger les refresh tokens expirés, backup + vacuum |
| MinIO refuse connexions | `docker compose -f docker-compose.prod.yml logs minio` | Vérifier disque, `docker compose -f docker-compose.prod.yml restart minio` |
| Emails non envoyés | `docker compose -f docker-compose.prod.yml logs api \| grep -i email` | Vérifier `EMAIL_SMTP_*` (host vide = envoi désactivé), credentials Brevo |
| Secret fuité (git, logs) | · | Rotation immédiate : nouveau secret dans `.env.production`, `docker compose -f docker-compose.prod.yml up -d --force-recreate`, invalider les refresh tokens (`DELETE FROM auth_refresh_tokens` ; la rotation de `API_JWT_SECRET` invalide aussi tous les access tokens en cours) |
