/**
 * Configuration de l'application.
 *
 * Les valeurs par défaut visent la stack de dev (DB PostGIS sur :5438). Les
 * variables d'environnement gardent les noms historiques (double underscore)
 * pour une bascule sans changement d'infra : `ConnectionStrings__Default`,
 * `ConnectionStrings__Migrations`, `Dorloter__Security__Jwt__Secret`, etc.
 */

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  /** `search_path` appliqué à chaque connexion (schéma `dorloter_api`). */
  searchPath: string;
}

export interface JwtConfig {
  secret: string;
  issuer: string;
  /** Durée de vie de l'access token, en secondes. */
  accessTtlSeconds: number;
  /** Durée de vie du refresh token, en secondes. */
  refreshTtlSeconds: number;
}

/**
 * Transport SMTP des emails transactionnels. `host` vide désactive l'envoi :
 * l'émetteur se contente alors de loguer, et les traitements qui dépendent
 * d'une remise effective (relance avant suppression d'un compte inactif) ne
 * s'exécutent pas.
 */
export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
  /** STARTTLS sur 587 (défaut) ou TLS implicite sur 465. */
  secure: boolean;
}

/**
 * Stockage objet S3-compatible. `endpoint` doit être l'URL **publiquement
 * joignable** du service : c'est l'hôte que le client contactera, et il entre
 * dans la signature. En dev, MinIO sur :9000 ; en prod, le sous-domaine `cdn.`
 * servi par Caddy (MinIO connaît cette URL via `MINIO_SERVER_URL`).
 */
export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  /** Base des URL publiques des objets (`<endpoint>/<bucket>` par défaut). */
  publicBaseUrl: string;
  /** Validité d'une URL signée : assez pour uploader, court pour l'interception. */
  presignTtlSeconds: number;
}

export interface Config {
  bindAddress: string;
  port: number;
  autoMigrate: boolean;
  db: DbConfig;
  /** Connexion DDL dédiée pour les migrations (rôle à privilèges), si fournie. */
  dbMigrations: DbConfig | null;
  jwt: JwtConfig;
  corsOrigins: string[];
  email: EmailConfig;
  s3: S3Config;
  /** URL publique du site, utilisée dans les liens des emails. */
  publicWebUrl: string;
}

const DEFAULT_CONNECTION =
  'Host=localhost;Port=5438;Database=dorloter;Username=dorloter;' +
  'Password=dorloter;Search Path=dorloter_api,public';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:8081',
].join(',');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const bindAddr = env.BIND_ADDR ?? '0.0.0.0:8080';
  const [host, port] = splitBindAddress(bindAddr);

  return {
    bindAddress: host,
    port,
    autoMigrate: env.Dorloter__Database__AutoMigrate !== 'false',
    db: parseConnectionString(env.ConnectionStrings__Default ?? DEFAULT_CONNECTION),
    dbMigrations: env.ConnectionStrings__Migrations
      ? parseConnectionString(env.ConnectionStrings__Migrations)
      : null,
    jwt: {
      secret:
        env.Dorloter__Security__Jwt__Secret ??
        'dev-only-insecure-secret-please-change-0123456789abcdef',
      issuer: env.Dorloter__Security__Jwt__Issuer ?? 'dorloter-api',
      accessTtlSeconds: 15 * 60,
      refreshTtlSeconds: 30 * 24 * 60 * 60,
    },
    corsOrigins: (env.Dorloter__Security__CorsAllowedOrigins ?? DEFAULT_CORS_ORIGINS)
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    email: {
      host: env.EMAIL_SMTP_HOST?.trim() ?? '',
      port: Number.parseInt(env.EMAIL_SMTP_PORT ?? '587', 10) || 587,
      user: env.EMAIL_SMTP_USER ?? '',
      password: env.EMAIL_SMTP_PASSWORD ?? '',
      fromAddress: env.EMAIL_FROM ?? 'no-reply@dorloter.fr',
      fromName: env.EMAIL_FROM_NAME ?? 'Dorloter',
      secure: (env.EMAIL_SMTP_PORT ?? '587') === '465',
    },
    s3: loadS3Config(env),
    publicWebUrl: (env.Dorloter__PublicWebUrl ?? 'https://dorloter.fr').replace(/\/+$/, ''),
  };
}

function loadS3Config(env: NodeJS.ProcessEnv): S3Config {
  const endpoint = (env.S3_ENDPOINT ?? 'http://localhost:9000').replace(/\/+$/, '');
  const bucket = env.S3_BUCKET ?? 'dorloter-photos';
  return {
    endpoint,
    region: env.S3_REGION ?? 'us-east-1',
    bucket,
    accessKey: env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: env.S3_SECRET_KEY ?? 'minioadmin',
    publicBaseUrl: (env.S3_PUBLIC_BASE_URL ?? `${endpoint}/${bucket}`).replace(/\/+$/, ''),
    presignTtlSeconds: 5 * 60,
  };
}

/** `0.0.0.0:8080` -> `['0.0.0.0', 8080]`. Un port seul est accepté. */
function splitBindAddress(value: string): [string, number] {
  const index = value.lastIndexOf(':');
  if (index < 0) return ['0.0.0.0', Number.parseInt(value, 10) || 8080];
  const host = value.slice(0, index) || '0.0.0.0';
  const port = Number.parseInt(value.slice(index + 1), 10) || 8080;
  return [host, port];
}

/**
 * Parse une chaîne de connexion au format Npgsql :
 * « Host=...;Port=...;Database=...;Username=...;Password=...;Search Path=... ».
 */
function parseConnectionString(conn: string): DbConfig {
  const pairs = new Map<string, string>();
  for (const part of conn.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    pairs.set(part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim());
  }
  const get = (keys: string[], fallback: string): string => {
    for (const key of keys) {
      const value = pairs.get(key);
      if (value !== undefined && value !== '') return value;
    }
    return fallback;
  };
  return {
    host: get(['host', 'server'], 'localhost'),
    port: Number.parseInt(get(['port'], '5438'), 10) || 5438,
    database: get(['database'], 'dorloter'),
    username: get(['username', 'user id', 'userid'], 'dorloter'),
    password: get(['password'], 'dorloter'),
    searchPath: get(['search path', 'searchpath'], 'dorloter_api,public'),
  };
}

/** Jeton d'injection de la configuration applicative. */
export const CONFIG = Symbol('DORLOTER_CONFIG');
