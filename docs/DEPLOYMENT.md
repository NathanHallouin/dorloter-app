# Déploiement Dorloter en production

Guide complet pour passer de rien à une prod qui tourne, puis pour la maintenir au quotidien.

> **Stack actuelle** : ce guide a été écrit pour l'ancien front Next.js (runtime
> Bun, ORM Drizzle, auth Better Auth) désormais retiré. La cible de prod
> aujourd'hui est : **Caddy** (TLS edge) qui sert la **SPA React/Vite statique**
> (`apps/web` buildé) et proxifie `/api/v1` vers l'**API** (`apps/api`),
> plus **Postgres/PostGIS** et **MinIO**, le tout dans un seul
> `docker-compose.prod.yml`. L'auth est en **JWT**, les migrations sont des
> fichiers SQL embarqués dans l'API, appliqués au démarrage (pas de
> `drizzle-kit migrate`). Les sections opérationnelles ci-dessous (provisioning
> VPS, hardening, DNS, Caddy, backups, monitoring, CI/CD par SSH) restent
> globalement valables ; seuls le build (Bun/Next remplacé par
> `bun run publish` + `vite build`), les commandes de migration et les variables
> Better Auth/Drizzle ont changé. Source de vérité : **[CLAUDE.md](../CLAUDE.md)**.

## 0. Ce qui est déjà prêt côté code

Avant de commencer, l'app est livrée avec :

- **Dockerfile** API (`bun run publish`) + build statique du front Vite servi par Caddy
- **docker-compose.prod.yml** : Postgres/PostGIS + MinIO + API + Caddy
- **Caddyfile** : reverse proxy + HTTPS Let's Encrypt auto (SPA statique + proxy `/api/v1`)
- **scripts/deploy.sh** : déploiement idempotent (build, migrate, restart)
- **scripts/backup.sh** : backup quotidien PG + MinIO vers bucket S3
- **[.github/workflows/ci.yml](../.github/workflows/ci.yml)** : build + tests sur chaque PR
- **[.github/workflows/deploy.yml](../.github/workflows/deploy.yml)** : déploiement auto à chaque push sur `main`
- Security headers (CSP, HSTS, Referrer-Policy, Permissions-Policy) servis par Caddy
- Endpoints cron protégés par `CRON_SECRET` (voir §8)
- `/api/v1/health` pour monitoring externe

## 1. Provisioning VPS

**Choix recommandé** : OVH VLE-4 (2 vCPU, 4 Go RAM, 80 Go NVMe) à ~7€/mois.
Alternative : Hetzner CX22 (~4€/mois, 4 Go RAM aussi).

### Commander le VPS

1. Console OVH → Public Cloud (ou VPS classique) → créer un VPS VLE-4
2. Image : **Ubuntu 24.04 LTS**
3. Ajouter votre clé SSH pendant la création (sinon vous recevrez un mot de passe root par email)
4. Attendre ~2 min que l'instance soit prête, noter l'IP publique

### DNS

Dans la zone DNS de votre domaine (OVH, Gandi, Cloudflare…) :

```
dorloter.fr      A    <IP du VPS>
cdn.dorloter.fr  A    <IP du VPS>
```

TTL 300s. Propagation DNS < 10 min en général.

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

### Installer Bun (requis pour quelques scripts, pas pour le runtime)

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Configurer `.env.production`

```bash
cp .env.production.example .env.production
```

Voir **[docs/ENV.md](./ENV.md)** pour le détail de chaque variable. Générer tous les secrets aléatoires :

```bash
cat <<EOF >> .env.production
Dorloter__Security__Jwt__Secret=$(openssl rand -base64 48)
POSTGRES_SUPERUSER_PASSWORD=$(openssl rand -base64 24)
DORLOTER_APP_PASSWORD=$(openssl rand -base64 24)
DORLOTER_ADMIN_PASSWORD=$(openssl rand -base64 24)
S3_ACCESS_KEY=$(openssl rand -hex 12)
S3_SECRET_KEY=$(openssl rand -hex 24)
CRON_SECRET=$(openssl rand -base64 32)
EOF
```

Puis éditer à la main :
- `DOMAIN`, `ACME_EMAIL`
- Clés VAPID (`bun x web-push generate-vapid-keys`)
- `VITE_MAPTILER_KEY` (front)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `S3_BACKUP_*` (bucket OVH ou équivalent)

### Premier déploiement

```bash
cd /opt/dorloter
docker compose -f docker-compose.prod.yml build   # ~3-5 min le premier coup (API + front Vite)
docker compose -f docker-compose.prod.yml up -d   # démarre tout ; l'API applique les migrations SQL au démarrage
bun prod:init-roles                               # crée dorloter_app / dorloter_admin + grants
```

Caddy obtient automatiquement les certificats Let's Encrypt au premier hit HTTPS. Attendre ~10s puis tester :

```bash
curl -s https://dorloter.fr/api/v1/health
# {"status":"ok","services":{"database":{...},"storage":{...}}}
```

### Planification des cron

```bash
sudo crontab -e
```

Ajouter (remplacer `$CRON_SECRET` par la valeur réelle) :

```cron
# Dorloter — jobs automatisés
CRON_SECRET=xxx

0 3 * * *   curl -sS "https://dorloter.fr/api/cron/expire-reports?token=$CRON_SECRET"             > /dev/null
0 4 * * *   curl -sS "https://dorloter.fr/api/cron/purge-expired-sessions?token=$CRON_SECRET"     > /dev/null
0 5 * * *   curl -sS "https://dorloter.fr/api/cron/refresh-matches?token=$CRON_SECRET"            > /dev/null
0 6 * * 0   curl -sS "https://dorloter.fr/api/cron/cleanup-orphan-photos?token=$CRON_SECRET"      > /dev/null
0 7 * * *   curl -sS "https://dorloter.fr/api/cron/remind-stale-reports?token=$CRON_SECRET"       > /dev/null
0 8 * * 1   curl -sS "https://dorloter.fr/api/cron/weekly-digest?token=$CRON_SECRET"              > /dev/null
0 9 * * 1   curl -sS "https://dorloter.fr/api/cron/remind-pending-applications?token=$CRON_SECRET" > /dev/null
0 3 1 * *   curl -sS "https://dorloter.fr/api/cron/purge-stale-conversations?token=$CRON_SECRET"  > /dev/null

# Backup quotidien à 2h du matin
0 2 * * *   cd /opt/dorloter && ./scripts/backup.sh >> /var/log/dorloter-backup.log 2>&1
```

### Monitoring externe

Uptime-check gratuit (requis pour être alerté si le site tombe) :

1. Compte sur [uptimerobot.com](https://uptimerobot.com) (50 monitors gratuits)
2. Add monitor → HTTP(s) → URL `https://dorloter.fr/api/health` → check every 5 min
3. Alert contact = votre email
4. Optionnel : un second monitor sur `https://dorloter.fr/` (home page)

## 3. CI/CD (déploiement auto depuis GitHub)

### Secrets GitHub à configurer

Dans `Settings → Secrets and variables → Actions` du repo :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP publique ou nom DNS du VPS (ex. `dorloter.fr`) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Clé SSH **privée** (ed25519) autorisée sur le VPS — voir §ci-dessous |
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
2. `git pull` la dernière version
3. Exécute `scripts/deploy.sh` qui rebuild l'image, migre la DB et relance les containers

Durée typique : 2–4 minutes. Pendant le build, le site reste up (l'ancien container tourne). Bascule quasi-instantanée en fin.

## 4. Maintenance au quotidien

### Logs

```bash
# Tous les services
bun prod:logs

# Un seul (app, postgres, minio, caddy)
docker compose -f docker-compose.prod.yml logs -f app
```

Les logs JSON de l'app (events via `lib/logger.ts`) sont dans `app` — parsables avec `jq` :

```bash
docker compose -f docker-compose.prod.yml logs app | grep '^{' | jq 'select(.event=="moderation.resolved")'
```

### Backup manuel

```bash
./scripts/backup.sh
```

Les backups sont dans `./backups/` en local (7 derniers jours) et sur le bucket S3 (rétention configurée côté provider, 30 jours recommandés).

### Restauration

```bash
# Stop app
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

### Mise à jour d'une dépendance

Sur votre machine locale :

```bash
bun update <package>
# tester en local
bun typecheck && bun dev
# commit + push → CI/CD prend le relais
git commit -am "chore: bump <package>"
git push
```

### Rollback rapide

```bash
ssh deploy@dorloter.fr
cd /opt/dorloter
git log --oneline -n 10       # identifier le commit stable précédent
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

# Health app
curl -s https://dorloter.fr/api/v1/health | jq
```

## 5. Incident : que faire si...

| Symptôme | Commande de diag | Fix probable |
|---|---|---|
| Site renvoie 502/503 | `docker compose logs app \| tail -50` | `bun prod:up --force-recreate app` |
| Certificat TLS expiré | `docker compose logs caddy \| grep -i error` | Vérifier que le port 80 est ouvert (ACME HTTP-01) |
| DB pleine | `docker compose exec postgres df -h` | Purger les refresh tokens expirés, backup + vacuum |
| MinIO refuse connexions | `docker compose logs minio` | Vérifier disque, `docker compose restart minio` |
| Secret fuité (git, logs) | · | Rotation immédiate : nouveau secret dans `.env.production`, `docker compose -f docker-compose.prod.yml up -d --force-recreate`, invalider les refresh tokens existants (`DELETE FROM auth_refresh_tokens` ; la rotation du `Jwt__Secret` invalide aussi tous les access tokens en cours) |
